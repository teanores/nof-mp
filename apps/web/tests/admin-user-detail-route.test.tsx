import { describe, expect, it, vi } from "vitest";

import type { AdminUserListItem } from "@/lib/server/admin-users-repository";
import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  fetchNofHtLink: vi.fn(),
  getUserById: vi.fn<(id: string) => Promise<AdminUserListItem | null>>(),
  listLinkedPlatformUserIds: vi.fn(),
  listUsers: vi.fn<() => Promise<AdminUserListItem[]>>(),
  listUsersByIds: vi.fn<() => Promise<AdminUserListItem[]>>(),
  recentEventsForActor: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  requirePortalPageSession: mocks.portalPageSession,
}));

vi.mock("@/lib/server/admin-users-repository", () => ({
  getAdminUsersRepository: () => ({ getUserById: mocks.getUserById, listUsers: mocks.listUsers, listUsersByIds: mocks.listUsersByIds }),
}));

vi.mock("@/lib/server/canonical-identity-repository", () => ({
  getCanonicalIdentityRepository: () => ({ listLinkedPlatformUserIds: mocks.listLinkedPlatformUserIds }),
}));

vi.mock("@/lib/server/service-links-contract", () => ({
  fetchNofHtLink: mocks.fetchNofHtLink,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  getSecurityAuditDashboardRepository: () => ({ recentEventsForActor: mocks.recentEventsForActor }),
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent,
}));

import AdminUserDetailRoute from "@/app/admin/users/[userId]/page";

function adminSession(): ForgePortalSession {
  return {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "admin-1",
      role: { id: 1, name: "admin" },
      username: "admin",
    },
  };
}

describe("admin user detail route", () => {
  it("loads the selected user for admins", async () => {
    mocks.portalPageSession.mockResolvedValue(adminSession());
    mocks.getUserById.mockResolvedValue({
      accountState: "password-login",
      accessState: "active",
      hasPassword: true,
      id: "u-1",
      recoveryState: "email-reset-ready",
      risks: [],
      username: "owner",
    });
    mocks.listUsers.mockResolvedValue([
      {
        accountState: "password-login",
        accessState: "active",
        hasPassword: true,
        id: "u-1",
        recoveryState: "email-reset-ready",
        risks: [],
        username: "owner",
      },
      {
        accountState: "password-login",
        accessState: "active",
        email: "canonical@example.com",
        hasPassword: true,
        id: "u-2",
        recoveryState: "email-reset-ready",
        risks: [],
        username: "canonical",
      },
    ]);
    mocks.fetchNofHtLink.mockResolvedValue({
      serviceKey: "nof-ht",
      serviceName: "Habit Tracker",
      status: "connected",
      accountEmail: "owner@example.com",
      canUnlink: true,
      openHref: "https://habit-tracker.forgath.ru/",
    });
    mocks.recentEventsForActor.mockResolvedValue([
      {
        activityLabel: "Успешный вход",
        createdAt: "2026-06-20T08:00:00.000Z",
        id: "event-1",
        method: "POST",
        path: "/api/login",
        statusCode: 303,
      },
    ]);
    mocks.listLinkedPlatformUserIds.mockResolvedValue({ personId: "person-1", platformUserIds: ["u-1", "u-2"] });
    mocks.listUsersByIds.mockResolvedValue([
      {
        accountState: "password-login",
        accessState: "active",
        hasPassword: true,
        id: "u-1",
        recoveryState: "email-reset-ready",
        risks: [],
        username: "owner",
      },
      {
        accountState: "password-login",
        accessState: "active",
        email: "canonical@example.com",
        hasPassword: true,
        id: "u-2",
        recoveryState: "email-reset-ready",
        risks: [],
        username: "canonical",
      },
    ]);

    const result = await AdminUserDetailRoute({ params: Promise.resolve({ userId: "u-1" }) });

    expect(mocks.getUserById).toHaveBeenCalledWith("u-1");
    expect(mocks.fetchNofHtLink).toHaveBeenCalledWith("u-1");
    expect(mocks.recentEventsForActor).toHaveBeenCalledWith("u-1");
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_user_detail_view",
        path: "/admin/users/u-1",
      }),
    );
    expect(result.type.name).toBe("AdminUserDetailPage");
    expect(result.props.user.id).toBe("u-1");
    expect(result.props.canonicalCandidates).toHaveLength(2);
    expect(result.props.identityPersonId).toBe("person-1");
    expect(result.props.linkedIdentityUsers).toHaveLength(2);
    expect(result.props.serviceLinks).toHaveLength(1);
    expect(result.props.recentActivity).toHaveLength(1);
  });

  it("returns not found when the selected user does not exist", async () => {
    mocks.portalPageSession.mockResolvedValue(adminSession());
    mocks.getUserById.mockResolvedValue(null);

    await expect(AdminUserDetailRoute({ params: Promise.resolve({ userId: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("renders the selected user even when audit activity lookup fails", async () => {
    mocks.portalPageSession.mockResolvedValue(adminSession());
    mocks.getUserById.mockResolvedValue({
      accountState: "password-login",
      accessState: "active",
      hasPassword: true,
      id: "u-1",
      recoveryState: "email-reset-ready",
      risks: [],
      username: "owner",
    });
    mocks.listUsers.mockResolvedValue([]);
    mocks.fetchNofHtLink.mockResolvedValue({
      serviceKey: "nof-ht",
      serviceName: "Habit Tracker",
      status: "unavailable",
      canUnlink: false,
      openHref: "https://habit-tracker.forgath.ru/",
    });
    mocks.recentEventsForActor.mockRejectedValue(new Error("audit_down"));
    mocks.listLinkedPlatformUserIds.mockResolvedValue(null);

    const result = await AdminUserDetailRoute({ params: Promise.resolve({ userId: "u-1" }) });

    expect(result.props.recentActivity).toEqual([]);
  });
});
