import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

import { requirePortalApiSession } from "@/lib/server/portal-auth-gate";

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function request(cookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/profile/preferences", {
    headers: cookie ? { cookie } : {},
    method: "GET",
  });
}

describe("session expired audit policy", () => {
  beforeEach(() => {
    process.env.SECRET_KEY = "session-secret";
    audit.recordSecurityAuditEvent.mockReset();
  });

  it("records exactly one event for a previously authenticated expired cookie", async () => {
    const token = sign(
      { exp: Math.floor(Date.now() / 1000) - 60, sub: "user-1", username: "owner" },
      "session-secret",
    );

    const response = await requirePortalApiSession(request(`auth_token=${token}`));

    expect(response?.status).toBe(401);
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledTimes(1);
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        actorUsername: "owner",
        eventType: "session_expired",
        method: "GET",
        path: "/api/profile/preferences",
        statusCode: 401,
      }),
    );
    expect(response?.headers.getSetCookie().join("\n")).toContain("auth_token=");
    expect(response?.headers.getSetCookie().join("\n")).toContain("nof_session_expired_audit=");
  });

  it("does not record session_expired for anonymous requests", async () => {
    const response = await requirePortalApiSession(request());

    expect(response?.status).toBe(401);
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("does not duplicate session_expired when the marker cookie is present", async () => {
    const token = sign(
      { exp: Math.floor(Date.now() / 1000) - 60, sub: "user-1", username: "owner" },
      "session-secret",
    );

    const response = await requirePortalApiSession(request(`auth_token=${token}; nof_session_expired_audit=1`));

    expect(response?.status).toBe(401);
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
