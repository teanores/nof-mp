import { describe, expect, it, vi } from "vitest";

import type { AdminUserListItem } from "@/lib/server/admin-users-repository";
import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
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

    const result = await AdminUserDetailRoute({ params: Promise.resolve({ userId: "u-1" }) });

    expect(mocks.getUserById).toHaveBeenCalledWith("u-1");
    expect(result.type.name).toBe("AdminUserDetailPage");
    expect(result.props.user.id).toBe("u-1");
  });

  it("returns not found when the selected user does not exist", async () => {
    mocks.portalPageSession.mockResolvedValue(adminSession());
    mocks.getUserById.mockResolvedValue(null);

    await expect(AdminUserDetailRoute({ params: Promise.resolve({ userId: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
