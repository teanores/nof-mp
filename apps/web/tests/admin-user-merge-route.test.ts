import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  mergeUserIntoCanonical: vi.fn(),
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

import { POST } from "@/app/api/admin/users/[userId]/merge/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/source-1/merge", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin user canonical merge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminUsersRepository.mergeUserIntoCanonical.mockResolvedValue({
      sourceUserId: "source-1",
      targetUserId: "target-1",
    });
  });

  it("rejects the legacy source-to-target merge while the multi-alias model is pending", async () => {
    const response = await POST(request({ targetUserId: "target-1" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({ error: "multi_alias_model_required" });
    expect(adminUsersRepository.mergeUserIntoCanonical).not.toHaveBeenCalled();
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects merging an account into itself", async () => {
    const response = await POST(request({ targetUserId: "source-1" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "cannot_merge_self" });
    expect(adminUsersRepository.mergeUserIntoCanonical).not.toHaveBeenCalled();
  });

  it("requires a target canonical user id", async () => {
    const response = await POST(request({ targetUserId: "" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "target_user_required" });
  });
});
