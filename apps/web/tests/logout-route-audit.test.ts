import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "user-1",
      username: "owner",
    },
  } as ForgePortalSession,
}));

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

import { POST } from "@/app/api/logout/route";

function request(): NextRequest {
  return new NextRequest("http://localhost/api/logout", { method: "POST" });
}

describe("logout route audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "user-1",
        username: "owner",
      },
    };
  });

  it("records authenticated logout without changing cookie cleanup", async () => {
    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        actorUsername: "owner",
        eventType: "logout_success",
        method: "POST",
        path: "/api/logout",
        statusCode: 303,
      }),
    );
  });

  it("does not write logout audit for anonymous requests", async () => {
    authSession.value = { authenticated: false, loginUrl: "/login" };

    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
