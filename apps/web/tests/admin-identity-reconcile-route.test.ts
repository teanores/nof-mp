import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

const canonicalIdentityRepository = vi.hoisted(() => ({
  reconcilePlatformUsers: vi.fn(),
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

import { POST } from "@/app/api/admin/identity/reconcile/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/identity/reconcile", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin identity reconciliation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminUsersRepository.getUserById.mockImplementation(async (userId: string) => {
      const users = {
        "email-user": {
          email: "owner@example.com",
          id: "email-user",
          telegram: undefined,
          username: "owner",
        },
        "telegram-user": {
          email: undefined,
          id: "telegram-user",
          telegram: { id: 251740038, username: "teanore" },
          username: "teanore",
        },
        "extra-user": {
          email: undefined,
          id: "extra-user",
          telegram: { id: 614815689 },
          username: "extra",
        },
      };
      return users[userId as keyof typeof users] ?? null;
    });
    canonicalIdentityRepository.reconcilePlatformUsers.mockResolvedValue({
      linkedUserIds: ["email-user", "telegram-user", "extra-user"],
      ok: true,
      personId: "person-1",
    });
  });

  it("reconciles selected accounts into an explicit canonical person without accepting raw aliases from the browser", async () => {
    const response = await POST(
      request({
        canonicalUserId: "email-user",
        userIds: ["email-user", "telegram-user", "extra-user"],
        email: "attacker@example.com",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ linkedUserIds: ["email-user", "telegram-user", "extra-user"], ok: true, personId: "person-1" });
    expect(canonicalIdentityRepository.reconcilePlatformUsers).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      canonicalPlatformUserId: "email-user",
      users: [
        {
          actorUserId: "admin-1",
          aliases: [{ aliasKind: "email", aliasValue: "owner@example.com", verificationState: "unverified" }],
          platformUserId: "email-user",
        },
        {
          actorUserId: "admin-1",
          aliases: [
            { aliasKind: "telegram_id", aliasProvider: "telegram", aliasValue: 251740038, verificationState: "unverified" },
            { aliasKind: "telegram_username", aliasProvider: "telegram", aliasValue: "teanore", verificationState: "unverified" },
          ],
          platformUserId: "telegram-user",
        },
        {
          actorUserId: "admin-1",
          aliases: [{ aliasKind: "telegram_id", aliasProvider: "telegram", aliasValue: 614815689, verificationState: "unverified" }],
          platformUserId: "extra-user",
        },
      ],
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "admin_identity_reconciliation_updated" }));
  });

  it("requires the canonical user to be included in the selected accounts", async () => {
    const response = await POST(request({ canonicalUserId: "email-user", userIds: ["telegram-user"] }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "canonical_user_required" });
    expect(canonicalIdentityRepository.reconcilePlatformUsers).not.toHaveBeenCalled();
  });
});
