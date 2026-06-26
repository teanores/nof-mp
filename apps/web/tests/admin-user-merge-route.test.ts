import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

const canonicalIdentityRepository = vi.hoisted(() => ({
  claimAliasesForPlatformUser: vi.fn(),
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

vi.mock("@/lib/server/canonical-identity-repository", () => ({
  getCanonicalIdentityRepository: () => canonicalIdentityRepository,
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
    adminUsersRepository.getUserById
      .mockResolvedValueOnce({
        email: undefined,
        id: "source-1",
        telegram: { id: 251740038, username: "teanore" },
      })
      .mockResolvedValueOnce({
        email: "owner@example.com",
        id: "target-1",
        telegram: undefined,
      });
    canonicalIdentityRepository.claimAliasesForPlatformUser.mockResolvedValue({ aliasIds: ["alias-1"], ok: true, personId: "person-1" });
  });

  it("links source and target users through canonical aliases without legacy field transfer", async () => {
    const response = await POST(request({ targetUserId: "target-1" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, personId: "person-1", sourceUserId: "source-1", targetUserId: "target-1" });
    expect(canonicalIdentityRepository.claimAliasesForPlatformUser).toHaveBeenNthCalledWith(1, {
      actorUserId: "admin-1",
      aliases: [
        {
          aliasKind: "email",
          aliasValue: "owner@example.com",
          verificationState: "unverified",
        },
      ],
      platformUserId: "target-1",
    });
    expect(canonicalIdentityRepository.claimAliasesForPlatformUser).toHaveBeenNthCalledWith(2, {
      actorUserId: "admin-1",
      aliases: [
        {
          aliasKind: "telegram_id",
          aliasProvider: "telegram",
          aliasValue: 251740038,
          verificationState: "unverified",
        },
        {
          aliasKind: "telegram_username",
          aliasProvider: "telegram",
          aliasValue: "teanore",
          verificationState: "unverified",
        },
      ],
      personId: "person-1",
      platformUserId: "source-1",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "admin_user_identity_link_updated" }));
  });

  it("rejects merging an account into itself", async () => {
    const response = await POST(request({ targetUserId: "source-1" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "cannot_merge_self" });
  });

  it("requires a target canonical user id", async () => {
    const response = await POST(request({ targetUserId: "" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "target_user_required" });
  });

  it("returns a conflict when aliases belong to different people", async () => {
    canonicalIdentityRepository.claimAliasesForPlatformUser
      .mockResolvedValueOnce({ aliasIds: ["alias-1"], ok: true, personId: "person-1" })
      .mockResolvedValueOnce({ ok: false, reason: "alias_conflict" });

    const response = await POST(request({ targetUserId: "target-1" }), { params: Promise.resolve({ userId: "source-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({ error: "alias_conflict" });
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
