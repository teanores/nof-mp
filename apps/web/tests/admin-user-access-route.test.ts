import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  setAccessState: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "admin-1",
      role: { id: 1, name: "admin" },
      username: "admin",
    },
  } as ForgePortalSession,
}));

vi.mock("@/lib/server/admin-users-repository", () => ({
  getAdminUsersRepository: () => adminUsersRepository,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => {
    if (authSession.value.authenticated) return undefined;
    return Response.json({ authenticated: false, error: "Authentication required" }, { status: 401 });
  }),
}));

import { POST } from "@/app/api/admin/users/[userId]/access/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/access", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin user access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "admin-1",
        role: { id: 1, name: "admin" },
        username: "admin",
      },
    };
    adminUsersRepository.setAccessState.mockResolvedValue({
      accessState: "denied",
      id: "user-1",
      username: "user",
    });
  });

  it("denies selected user access and records admin audit", async () => {
    const response = await POST(request({ action: "deny", reason: "admin_review" }), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ accessState: "denied", ok: true });
    expect(adminUsersRepository.setAccessState).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      denied: true,
      reason: "admin_review",
      userId: "user-1",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_user_access_updated",
        path: "/api/admin/users/user-1/access",
        statusCode: 200,
      }),
    );
  });

  it("restores selected user access", async () => {
    adminUsersRepository.setAccessState.mockResolvedValue({
      accessState: "active",
      id: "user-1",
      username: "user",
    });

    const response = await POST(request({ action: "restore" }), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ accessState: "active", ok: true });
    expect(adminUsersRepository.setAccessState).toHaveBeenCalledWith(
      expect.objectContaining({
        denied: false,
        reason: undefined,
      }),
    );
  });

  it("does not let an admin deny their own active account", async () => {
    const response = await POST(request({ action: "deny" }), { params: Promise.resolve({ userId: "admin-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "cannot_deny_self" });
    expect(adminUsersRepository.setAccessState).not.toHaveBeenCalled();
  });
});
