import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  deleteUser: vi.fn(),
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

import { POST } from "@/app/api/admin/users/[userId]/delete/route";

function request(): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/delete", {
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin user delete route", () => {
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
    adminUsersRepository.deleteUser.mockResolvedValue({
      id: "user-1",
      username: "test-user",
    });
  });

  it("deletes a selected non-self user and records admin audit", async () => {
    const response = await POST(request(), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ deletedUserId: "user-1", ok: true });
    expect(adminUsersRepository.deleteUser).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      userId: "user-1",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_user_deleted",
        path: "/api/admin/users/user-1/delete",
        statusCode: 200,
      }),
    );
  });

  it("does not let an admin delete their own active account", async () => {
    const response = await POST(request(), { params: Promise.resolve({ userId: "admin-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "cannot_delete_self" });
    expect(adminUsersRepository.deleteUser).not.toHaveBeenCalled();
  });

  it("returns not found when the selected user does not exist", async () => {
    adminUsersRepository.deleteUser.mockResolvedValue(null);

    const response = await POST(request(), { params: Promise.resolve({ userId: "missing-user" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "user_not_found" });
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
