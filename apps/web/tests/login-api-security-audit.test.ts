import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/login/route";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

vi.mock("@/lib/server/dragon-forge-auth", () => ({
  decodeDragonForgeAuthToken: vi.fn(() => ({ sub: "user-1" })),
}));

vi.mock("@/lib/server/dragon-forge-login", () => ({
  authCookieValueFromResponse: vi.fn(() => "auth-token"),
  buildPortalLoginFailedRedirect: vi.fn(() => new Response(null, { headers: { location: "/login?error=1" }, status: 303 })),
  buildPortalLoginRedirect: vi.fn(() => new Response(null, { headers: { location: "/overview" }, status: 303 })),
  copyAuthCookies: vi.fn(),
  dragonForgeInternalLoginUrl: vi.fn(() => "http://dragon-forge/login"),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: vi.fn(),
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
});
