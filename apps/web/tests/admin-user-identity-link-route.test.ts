import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  updateUserIdentityLink: vi.fn(),
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

import { POST } from "@/app/api/admin/users/[userId]/identity-link/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/identity-link", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin user identity link route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminUsersRepository.updateUserIdentityLink.mockResolvedValue({
      email: "owner@example.com",
      id: "user-1",
      telegram: { id: 251740038, username: "teanore" },
    });
  });

  it("updates real email and Telegram association for a selected user", async () => {
    const response = await POST(request({ email: "Owner@Example.com", telegramId: "251740038", telegramUsername: "teanore" }), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, userId: "user-1" });
    expect(adminUsersRepository.updateUserIdentityLink).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      email: "owner@example.com",
      telegramId: 251740038,
      telegramUsername: "teanore",
      userId: "user-1",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_user_identity_link_updated",
        path: "/api/admin/users/user-1/identity-link",
        statusCode: 200,
      }),
    );
  });

  it("rejects Telegram placeholder email as a real mailbox", async () => {
    const response = await POST(request({ email: "251740038@telegram.forgath.ru", telegramId: "251740038" }), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "real_email_required" });
    expect(adminUsersRepository.updateUserIdentityLink).not.toHaveBeenCalled();
  });

  it("rejects legacy user-id forged email as a real mailbox", async () => {
    const response = await POST(request({ email: "user614815689@forgath.ru", telegramId: "614815689" }), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "real_email_required" });
    expect(adminUsersRepository.updateUserIdentityLink).not.toHaveBeenCalled();
  });

  it("rejects invalid Telegram id", async () => {
    const response = await POST(request({ email: "owner@example.com", telegramId: "not-a-number" }), {
      params: Promise.resolve({ userId: "user-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "telegram_id_required" });
  });
});
