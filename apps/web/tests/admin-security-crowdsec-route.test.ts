import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMock = vi.hoisted(() => ({
  session: {
    authenticated: true,
    loginUrl: "/login",
    user: { experience: 0, id: "admin-1", role: { id: 1, name: "admin" }, username: "teanore" },
  },
}));

const dashboardRepository = vi.hoisted(() => ({
  dashboard: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => sessionMock.session),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  getSecurityAuditDashboardRepository: () => dashboardRepository,
}));

import { GET } from "@/app/api/admin/security/crowdsec/route";

function request(): NextRequest {
  return new NextRequest("https://forgath.ru/api/admin/security/crowdsec", { method: "GET" });
}

describe("admin CrowdSec metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardRepository.dashboard.mockResolvedValue({
      generatedAt: "2026-06-27T16:20:00.000Z",
      recentEvents: [
        {
          activityLabel: "Ограничение частоты",
          actorLabel: "Периметр",
          classification: "rate_limited",
          createdAt: "2026-06-27T16:19:00.000Z",
          id: "event-1",
          ip: "203.0.113.42",
          method: "GET",
          path: "/wp-login.php",
          statusCode: 429,
          userAgent: "curl",
        },
      ],
      recommendation: "Наблюдать",
      summary: {
        failedLogins: 0,
        forbidden: 0,
        notFound: 0,
        rateLimited: 1,
        successfulLogins: 0,
        suspiciousScans: 0,
      },
      topPaths: [],
      topSources: [],
    });
    sessionMock.session = {
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "admin-1", role: { id: 1, name: "admin" }, username: "teanore" },
    };
  });

  it("returns sanitized CrowdSec metrics for admins", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.totalSignals).toBe(1);
    expect(payload.topSourceBuckets).toEqual([{ bucket: "203.0.113.0/24", count: 1 }]);
    expect(JSON.stringify(payload)).not.toContain("203.0.113.42");
    expect(JSON.stringify(payload)).not.toContain("token");
  });

  it("returns 404 for non-admin sessions", async () => {
    sessionMock.session = {
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "user-1", role: { id: 2, name: "user" }, username: "reader" },
    };

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(dashboardRepository.dashboard).not.toHaveBeenCalled();
  });
});
