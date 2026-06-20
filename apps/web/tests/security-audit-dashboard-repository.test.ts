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

  it("loads recent sanitized activity for one actor", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            actor_user_id: "user-1",
            actor_username: "owner",
            classification: "auth",
            created_at: new Date("2026-06-20T08:00:00.000Z"),
            event_type: "login_success",
            id: "event-1",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/login",
            status_code: 303,
            user_agent: "Chrome",
          },
        ],
      });
    const repository = new SecurityAuditDashboardRepository({ query } as never, "nof_mp_security");

    await expect(repository.recentEventsForActor("user-1")).resolves.toEqual([
      {
        activityLabel: "Успешный вход",
        createdAt: "2026-06-20T08:00:00.000Z",
        id: "event-1",
        method: "POST",
        path: "/api/login",
        statusCode: 303,
      },
    ]);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("WHERE actor_user_id = $1"), ["user-1", 12]);
    expect(JSON.stringify(query.mock.calls)).not.toContain("password");
    expect(JSON.stringify(query.mock.calls)).not.toContain("token");
  });

  it("loads recent sanitized account events across actors", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:30:00.000Z"),
            event_type: "admin_password_reset_requested",
            id: "event-1",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/admin/users/user-1/password-reset",
            status_code: 200,
            user_agent: "Chrome",
          },
        ],
      });
    const repository = new SecurityAuditDashboardRepository({ query } as never, "nof_mp_security");

    await expect(repository.recentAccountEvents()).resolves.toEqual([
      {
        activityLabel: "Администратор отправил восстановление",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:30:00.000Z",
        id: "event-1",
        method: "POST",
        path: "/api/admin/users/user-1/password-reset",
        statusCode: 200,
      },
    ]);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("event_type IN"), [100]);
    expect(JSON.stringify(query.mock.calls)).not.toContain("resetToken");
    expect(JSON.stringify(query.mock.calls)).not.toContain("Bearer");
  });
});
