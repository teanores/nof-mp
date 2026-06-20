import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
  recentAccountEvents: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  requirePortalPageSession: mocks.portalPageSession,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  getSecurityAuditDashboardRepository: () => ({ recentAccountEvents: mocks.recentAccountEvents }),
}));

import AdminEventsRoute from "@/app/admin/events/page";

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

describe("admin events route", () => {
  it("renders events for admins", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("admin"));
    mocks.recentAccountEvents.mockResolvedValue([{ id: "event-1" }]);

    const result = await AdminEventsRoute();

    expect(mocks.portalPageSession).toHaveBeenCalledWith("/admin/events");
    expect(mocks.recentAccountEvents).toHaveBeenCalled();
    expect(result.type.name).toBe("AdminEventsPage");
    expect(result.props.events).toHaveLength(1);
  });

  it("returns not found for moderators", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("moderator"));

    await expect(AdminEventsRoute()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("renders an empty journal when audit lookup fails", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("admin"));
    mocks.recentAccountEvents.mockRejectedValue(new Error("audit_down"));

    const result = await AdminEventsRoute();

    expect(result.props.events).toEqual([]);
  });
});
