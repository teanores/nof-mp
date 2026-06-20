import { describe, expect, it, vi } from "vitest";

import type { AdminUserListItem } from "@/lib/server/admin-users-repository";
import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  fetchNofHtLink: vi.fn(),
  getUserById: vi.fn<(id: string) => Promise<AdminUserListItem | null>>(),
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
  getAdminUsersRepository: () => ({ getUserById: mocks.getUserById }),
}));

vi.mock("@/lib/server/service-links-contract", () => ({
  fetchNofHtLink: mocks.fetchNofHtLink,
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
      hasPassword: true,
      id: "u-1",
      recoveryState: "email-reset-ready",
      risks: [],
      username: "owner",
    });
    mocks.fetchNofHtLink.mockResolvedValue({
      serviceKey: "nof-ht",
      serviceName: "Habit Tracker",
      status: "connected",
      accountEmail: "owner@example.com",
      canUnlink: true,
      openHref: "https://habit-tracker.forgath.ru/",
    });

    const result = await AdminUserDetailRoute({ params: Promise.resolve({ userId: "u-1" }) });

    expect(mocks.getUserById).toHaveBeenCalledWith("u-1");
    expect(mocks.fetchNofHtLink).toHaveBeenCalledWith("u-1");
    expect(result.type.name).toBe("AdminUserDetailPage");
    expect(result.props.user.id).toBe("u-1");
    expect(result.props.serviceLinks).toHaveLength(1);
  });

  it("returns not found when the selected user does not exist", async () => {
    mocks.portalPageSession.mockResolvedValue(adminSession());
    mocks.getUserById.mockResolvedValue(null);

    await expect(AdminUserDetailRoute({ params: Promise.resolve({ userId: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
