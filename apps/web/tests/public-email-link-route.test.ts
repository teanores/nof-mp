import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const emailLinkRepository = vi.hoisted(() => ({
  confirmLink: vi.fn(),
  readLinkState: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/platform-email-link-repository", () => ({
  getPlatformEmailLinkRepository: () => emailLinkRepository,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

import { POST } from "@/app/api/public/email-link/confirm/route";
import { GET as getState } from "@/app/api/public/email-link/state/route";

function formRequest(body: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/public/email-link/confirm", {
    body: new URLSearchParams(body),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

describe("public email link confirm route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailLinkRepository.confirmLink.mockResolvedValue({ ok: true, userId: "user-1" });
    emailLinkRepository.readLinkState.mockResolvedValue({
      ok: true,
      state: {
        expiresAt: new Date("2026-06-22T10:30:00.000Z"),
        hasEmail: false,
        status: "active",
        telegram: { id: 251740038, username: "teanore" },
        userId: "user-1",
      },
    });
  });

  it("confirms a telegram onboarding token and redirects to login without leaking the token", async () => {
    const response = await POST(
      formRequest({
        email: " Owner@Example.COM ",
        password: "NextHorse22!",
        token: "raw-email-link-token",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?registered=1&linked=telegram");
    expect(emailLinkRepository.confirmLink).toHaveBeenCalledWith({
      email: "owner@example.com",
      newPassword: "NextHorse22!",
      token: "raw-email-link-token",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_success",
        loginIdentifier: expect.stringMatching(/^sha256:/),
        path: "/api/public/email-link/confirm",
        statusCode: 201,
      }),
    );
    expect(JSON.stringify(vi.mocked(audit.recordSecurityAuditEvent).mock.calls)).not.toContain("raw-email-link-token");
  });

  it("rejects invalid or expired onboarding tokens", async () => {
    emailLinkRepository.confirmLink.mockResolvedValueOnce({ ok: false, reason: "invalid_or_expired_token" });

    const response = await POST(
      formRequest({
        email: "owner@example.com",
        password: "NextHorse22!",
        token: "raw-email-link-token",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=invalid_link");
  });

  it("reads telegram parked state for a one-time token without exposing raw token metadata", async () => {
    const response = await getState(new NextRequest("http://localhost/api/public/email-link/state?token=raw-email-link-token"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(emailLinkRepository.readLinkState).toHaveBeenCalledWith({ token: "raw-email-link-token" });
    expect(payload).toEqual({
      ok: true,
      state: {
        expiresAt: "2026-06-22T10:30:00.000Z",
        hasEmail: false,
        status: "active",
        telegram: { id: 251740038, username: "teanore" },
      },
    });
    expect(JSON.stringify(payload)).not.toContain("raw-email-link-token");
    expect(JSON.stringify(payload)).not.toContain("user-1");
  });
});
