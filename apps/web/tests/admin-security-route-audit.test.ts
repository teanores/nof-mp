import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const session: ForgePortalSession = {
  authenticated: true,
  loginUrl: "/login",
  user: {
    experience: 0,
    id: "admin-1",
    role: { id: 1, name: "admin" },
    username: "owner",
  },
};

vi.mock("@/components/AdminSecurityPage", () => ({
  AdminSecurityPage: vi.fn(() => null),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  requirePortalPageSession: vi.fn(async () => session),
}));

vi.mock("@/lib/server/portal-admin", () => ({
  requirePortalAdminSession: vi.fn(),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  getSecurityAuditDashboardRepository: () => ({
    dashboard: vi.fn(async () => ({
      generatedAt: "2026-06-08T00:00:00.000Z",
      recentEvents: [],
      recommendation: "Наблюдать",
      summary: {
        failedLogins: 0,
        forbidden: 0,
        notFound: 0,
        rateLimited: 0,
        successfulLogins: 0,
        suspiciousScans: 0,
      },
      topPaths: [],
      topSources: [],
    })),
  }),
  recordSecurityAuditEvent: vi.fn(),
}));

import AdminSecurityRoute from "@/app/admin/security/page";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

describe("admin security route audit", () => {
  it("records admin security page access with actor metadata", async () => {
    await AdminSecurityRoute();

    expect(recordSecurityAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      actorUsername: "owner",
      eventType: "app_authenticated_request",
      method: "GET",
      path: "/admin/security",
      statusCode: 200,
      userAgent: "server-component",
    });
  });
});
