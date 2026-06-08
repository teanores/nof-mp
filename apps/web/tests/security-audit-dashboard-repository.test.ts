import { afterEach, describe, expect, it, vi } from "vitest";

import { SecurityAuditDashboardRepository, securityAuditSchemaName } from "@/lib/server/security-audit-dashboard";

const envKeys = ["NOF_PLATFORM_SECURITY_AUDIT_DB_SCHEMA", "NOF_PLATFORM_DB_SCHEMA"];

describe("security audit dashboard repository", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("uses the legacy tracker schema by default during migration", () => {
    expect(securityAuditSchemaName()).toBe("forge_tasks");
  });

  it("allows an explicit platform security audit schema", () => {
    process.env.NOF_PLATFORM_SECURITY_AUDIT_DB_SCHEMA = "nof_mp_security";
    process.env.NOF_PLATFORM_DB_SCHEMA = "nof_platform";

    expect(securityAuditSchemaName()).toBe("nof_mp_security");
  });

  it("creates and writes to the configured security audit schema", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new SecurityAuditDashboardRepository({ query } as never, "nof_mp_security");

    await repository.record({
      eventType: "edge_suspicious_scan",
      ip: "203.0.113.9",
      method: "GET",
      path: "/.env?token=value",
      statusCode: 404,
      userAgent: "curl/8.5.0",
    });

    expect(query).toHaveBeenCalledWith("CREATE SCHEMA IF NOT EXISTS nof_mp_security");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS nof_mp_security.security_audit_event"));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO nof_mp_security.security_audit_event"),
      expect.arrayContaining(["/.env?token=%5Bredacted%5D"]),
    );
    expect(JSON.stringify(query.mock.calls)).not.toContain("value");
  });
});
