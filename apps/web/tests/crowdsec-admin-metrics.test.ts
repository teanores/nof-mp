import { describe, expect, it } from "vitest";

import { crowdSecMetricsFromDashboard } from "@/lib/server/crowdsec-admin-metrics";
import type { SecurityAuditDashboard } from "@/lib/server/security-audit-dashboard";

const dashboard: SecurityAuditDashboard = {
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
    {
      activityLabel: "Запрет",
      actorLabel: "Периметр",
      classification: "forbidden",
      createdAt: "2026-06-27T16:18:00.000Z",
      id: "event-2",
      ip: "203.0.113.77",
      method: "GET",
      path: "/admin",
      statusCode: 403,
      userAgent: "browser",
    },
    {
      activityLabel: "Скан",
      actorLabel: "Периметр",
      classification: "suspicious_scan",
      createdAt: "2026-06-27T16:17:00.000Z",
      id: "event-3",
      ip: "198.51.100.10",
      method: "GET",
      path: "/.env",
      statusCode: 404,
      userAgent: "scanner",
    },
  ],
  recommendation: "Проверить пользователя",
  summary: {
    failedLogins: 0,
    forbidden: 1,
    notFound: 1,
    rateLimited: 1,
    successfulLogins: 0,
    suspiciousScans: 1,
  },
  topPaths: [],
  topSources: [
    { failedLogins: 0, ip: "203.0.113.42", scans: 0, total: 1 },
    { failedLogins: 0, ip: "203.0.113.77", scans: 0, total: 1 },
    { failedLogins: 0, ip: "198.51.100.10", scans: 1, total: 1 },
  ],
};

describe("CrowdSec admin metrics", () => {
  it("builds sanitized aggregate metrics from security events", () => {
    const metrics = crowdSecMetricsFromDashboard(dashboard, "https://app.crowdsec.net/security-engines");

    expect(metrics.totalSignals).toBe(3);
    expect(metrics.byType).toEqual([
      { count: 1, label: "Ограничения", type: "rate_limited" },
      { count: 1, label: "Запреты", type: "forbidden" },
      { count: 1, label: "Сканы", type: "suspicious_scan" },
    ]);
    expect(metrics.topSourceBuckets).toEqual([
      { bucket: "203.0.113.0/24", count: 2 },
      { bucket: "198.51.100.0/24", count: 1 },
    ]);
    expect(metrics.recentTimeline).toHaveLength(3);
    expect(metrics.consoleUrl).toBe("https://app.crowdsec.net/security-engines");
    expect(JSON.stringify(metrics)).not.toContain("203.0.113.42");
    expect(JSON.stringify(metrics)).not.toContain("192.168.1.51");
    expect(JSON.stringify(metrics)).not.toContain("token");
  });

  it("drops unsafe console URLs", () => {
    const metrics = crowdSecMetricsFromDashboard(dashboard, "http://192.168.1.51:8080");

    expect(metrics.consoleUrl).toBeUndefined();
  });
});
