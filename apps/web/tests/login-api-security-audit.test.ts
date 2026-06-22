import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/login/route";
import { resetAuthAbuseProtectionForTests } from "@/lib/server/auth-abuse-protection";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

vi.mock("@/lib/server/nof-portal-auth", () => ({
  decodeNofAuthToken: vi.fn(() => ({ sub: "user-1" })),
}));

vi.mock("@/lib/server/nof-service-client", () => ({
  authCookieValueFromResponse: vi.fn(() => "auth-token"),
  buildPortalLoginFailedRedirect: vi.fn(() => new Response(null, { headers: { location: "/login?error=1" }, status: 303 })),
  buildPortalLoginRedirect: vi.fn(() => new Response(null, { headers: { location: "/overview" }, status: 303 })),
  copyAuthCookies: vi.fn(),
  nofServiceLoginUrl: vi.fn(() => "http://nof-service/login"),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: vi.fn(),
}));

const passwordPolicyState = vi.hoisted(() => ({
  stateForUser: vi.fn(async () => ({ mustRotatePassword: false })),
}));

vi.mock("@/lib/server/password-policy-state-repository", () => ({
  getPasswordPolicyStateRepository: () => passwordPolicyState,
}));

vi.mock("@/lib/server/user-preferences-repository", () => ({
  getUserPreferencesRepository: () => ({
    upsert: vi.fn(),
  }),
}));

function loginRequest(fields: Record<string, string>, init?: RequestInit): NextRequest {
  const body = new URLSearchParams(fields);
  return new NextRequest("https://forgath.ru/api/login", {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Firefox/140",
      "x-forwarded-for": "203.0.113.11, 10.0.0.1",
      ...init?.headers,
    },
    method: "POST",
  });
}

describe("login API security audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthAbuseProtectionForTests();
    passwordPolicyState.stateForUser.mockResolvedValue({ mustRotatePassword: false });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("records missing credentials without sensitive values", async () => {
    await POST(loginRequest({ next: "/overview", password: "secret" }));

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "login_missing_credentials",
        ip: "203.0.113.11",
        method: "POST",
        path: "/api/login",
        statusCode: 400,
        userAgent: "Firefox",
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("secret");
  });

  it("records failed upstream login attempts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));

    await POST(loginRequest({ next: "/overview", password: "wrong-password", username: "owner@example.com" }));

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "login_failed",
        loginIdentifier: "owner@example.com",
        path: "/api/login",
        statusCode: 401,
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("wrong-password");
  });

  it("records successful logins with actor metadata", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { headers: { location: "/" }, status: 302 }));

    await POST(loginRequest({ language: "ru", next: "/overview", password: "correct-password", username: "owner@example.com" }));

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        actorUsername: "owner@example.com",
        eventType: "login_success",
        path: "/api/login",
        statusCode: 302,
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("correct-password");
  });

  it("redirects successful login to profile when password rotation is required", async () => {
    passwordPolicyState.stateForUser.mockResolvedValue({ mustRotatePassword: true });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { headers: { location: "/" }, status: 302 }));

    const response = await POST(loginRequest({ language: "ru", next: "/overview", password: "correct-password", username: "owner@example.com" }));

    expect(response.headers.get("location")).toBe("/profile?password=rotation-required");
    expect(passwordPolicyState.stateForUser).toHaveBeenCalledWith("user-1");
  });

  it("rate limits repeated login attempts before forwarding to upstream", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    for (let index = 0; index < 10; index += 1) {
      await POST(loginRequest({ next: "/overview", password: "wrong-password", username: "owner@example.com" }));
    }

    await POST(loginRequest({ next: "/overview", password: "wrong-password", username: "owner@example.com" }));

    expect(fetch).toHaveBeenCalledTimes(10);
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "login_rate_limited",
        loginIdentifier: "owner@example.com",
        statusCode: 429,
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("wrong-password");
  });
});
