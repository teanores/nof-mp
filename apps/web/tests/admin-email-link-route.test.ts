import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const adminUsersRepository = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

const emailLinkRepository = vi.hoisted(() => ({
  issueLink: vi.fn(),
}));

const messengerGateway = vi.hoisted(() => ({
  sendEmailLink: vi.fn(),
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

vi.mock("@/lib/server/platform-email-link-repository", () => ({
  getPlatformEmailLinkRepository: () => emailLinkRepository,
}));

vi.mock("@/lib/server/messenger-gateway", () => ({
  getMessengerGateway: () => messengerGateway,
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

import { POST } from "@/app/api/admin/users/[userId]/email-link/route";

function request(): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/email-link", { method: "POST" });
}

describe("admin email link route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminUsersRepository.getUserById.mockResolvedValue({
      email: "251740038@telegram.forgath.ru",
      id: "user-1",
      recoveryState: "service-email",
      risks: ["telegram-placeholder-email"],
      telegram: { id: 251740038, username: "teanore" },
      username: "teanore",
    });
    emailLinkRepository.issueLink.mockResolvedValue({
      expiresAt: new Date("2026-06-22T11:00:00.000Z"),
      ok: true,
      reason: "token_created",
      token: "raw-email-link-token",
      userId: "user-1",
    });
    messengerGateway.sendEmailLink.mockResolvedValue({
      ok: false,
      reason: "bot_gateway_not_configured",
      status: "blocked",
    });
  });

  it("prepares a one-time email link token through the gateway stub and records admin audit", async () => {
    const response = await POST(request(), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toEqual({
      delivery: { reason: "bot_gateway_not_configured", status: "blocked" },
      ok: true,
    });
    expect(emailLinkRepository.issueLink).toHaveBeenCalledWith({ actorUserId: "admin-1", userId: "user-1" });
    expect(messengerGateway.sendEmailLink).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: new Date("2026-06-22T11:00:00.000Z"),
        token: "raw-email-link-token",
        userId: "user-1",
      }),
    );
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_email_link_requested",
        path: "/api/admin/users/user-1/email-link",
        statusCode: 202,
      }),
    );
    expect(JSON.stringify(payload)).not.toContain("raw-email-link-token");
  });

  it("rejects accounts that are not telegram placeholder accounts", async () => {
    adminUsersRepository.getUserById.mockResolvedValue({
      email: "owner@example.com",
      id: "user-1",
      recoveryState: "email-reset-ready",
      risks: [],
      telegram: undefined,
      username: "owner",
    });

    const response = await POST(request(), { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "email_link_unavailable" });
    expect(emailLinkRepository.issueLink).not.toHaveBeenCalled();
    expect(messengerGateway.sendEmailLink).not.toHaveBeenCalled();
  });
});
