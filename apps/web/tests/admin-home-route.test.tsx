import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
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

import AdminHomeRoute from "@/app/admin/page";

function sessionWithRole(role: string): ForgePortalSession {
  return {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "u-1",
      role: { id: 1, name: role },
      username: role,
    },
  };
}

describe("admin home route", () => {
  it("renders for admins", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("admin"));

    const result = await AdminHomeRoute();

    expect(result.type.name).toBe("AdminHomePage");
    expect(result.props.session.user?.role?.name).toBe("admin");
  });

  it("returns not found for moderators", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("moderator"));

    await expect(AdminHomeRoute()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
