import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

const passwordResetRepository = vi.hoisted(() => ({
  requestReset: vi.fn(),
}));

const passwordResetDelivery = vi.hoisted(() => ({
  sendResetLink: vi.fn(),
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

vi.mock("@/lib/server/platform-password-reset-repository", () => ({
  getPlatformPasswordResetRepository: () => passwordResetRepository,
}));

vi.mock("@/lib/server/password-reset-delivery", () => ({
  getPasswordResetDelivery: () => passwordResetDelivery,
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

import { POST } from "@/app/api/admin/users/[userId]/password-reset/route";

function request(): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/password-reset", { method: "POST" });
}

describe("admin password reset route", () => {
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
    adminUsersRepository.getUserById.mockResolvedValue({
      email: "user@example.com",
      id: "user-1",
      recoveryState: "email-reset-ready",
      risks: [],
      username: "user",
    });
    passwordResetRepository.requestReset.mockResolvedValue({
      expiresAt: new Date("2026-06-20T09:00:00.000Z"),
      ok: true,
      reason: "token_created",
      resetToken: "raw-reset-token",
      userId: "user-1",
    });
    passwordResetDelivery.sendResetLink.mockResolvedValue({ mode: "smtp", ok: true });
  });

  it("sends reset email for selected user and records admin audit", async () => {
    const response = await POST(request(), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(passwordResetRepository.requestReset).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(passwordResetDelivery.sendResetLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        userId: "user-1",
      }),
    );
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_password_reset_requested",
        path: "/api/admin/users/user-1/password-reset",
        statusCode: 200,
      }),
    );
    expect(JSON.stringify(payload)).not.toContain("raw-reset-token");
  });

  it("rejects non-resettable users", async () => {
    adminUsersRepository.getUserById.mockResolvedValue({
      email: null,
      id: "user-1",
      recoveryState: "missing-email",
      risks: [],
      username: "user",
    });

    const response = await POST(request(), { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(400);
    expect(passwordResetDelivery.sendResetLink).not.toHaveBeenCalled();
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
