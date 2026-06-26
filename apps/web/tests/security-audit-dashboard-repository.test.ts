import { afterEach, describe, expect, it, vi } from "vitest";

import { SecurityAuditDashboardRepository, securityAuditSchemaName } from "@/lib/server/security-audit-dashboard";

const envKeys = ["NOF_PLATFORM_SECURITY_AUDIT_DB_SCHEMA", "NOF_PLATFORM_DB_SCHEMA"];

describe("security audit dashboard repository", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("uses the platform-owned audit schema by default", () => {
    expect(securityAuditSchemaName()).toBe("nof_platform");
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

  it("does not read or write the legacy tracker audit schema by default", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new SecurityAuditDashboardRepository({ query } as never);

    await repository.dashboard();

    const sql = JSON.stringify(query.mock.calls);
    expect(sql).toContain("nof_platform.security_audit_event");
    expect(sql).not.toContain("forge_tasks.security_audit_event");
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
          {
            actor_user_id: "user-1",
            actor_username: "owner",
            classification: "normal",
            created_at: new Date("2026-06-20T08:31:00.000Z"),
            event_type: "logout_success",
            id: "event-2",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/logout",
            status_code: 303,
            user_agent: "Chrome",
          },
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:32:00.000Z"),
            event_type: "admin_password_rotation_required",
            id: "event-3",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/admin/users/user-1/password-rotation",
            status_code: 200,
            user_agent: "Chrome",
          },
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:33:00.000Z"),
            event_type: "admin_user_access_updated",
            id: "event-4",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/admin/users/user-1/access",
            status_code: 200,
            user_agent: "Chrome",
          },
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:34:00.000Z"),
            event_type: "admin_user_deleted",
            id: "event-5",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "DELETE",
            path: "/api/admin/users/user-2/delete",
            status_code: 200,
            user_agent: "Chrome",
          },
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:35:00.000Z"),
            event_type: "admin_user_merged",
            id: "event-6",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/admin/users/source-1/merge",
            status_code: 200,
            user_agent: "Chrome",
          },
          {
            actor_user_id: "admin-1",
            actor_username: "admin",
            classification: "normal",
            created_at: new Date("2026-06-20T08:36:00.000Z"),
            event_type: "admin_user_identity_link_updated",
            id: "event-7",
            ip: "203.0.113.1",
            login_identifier: null,
            method: "POST",
            path: "/api/admin/users/user-1/identity-link",
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
      {
        activityLabel: "Выход из аккаунта",
        actorLabel: "Пользователь: owner",
        createdAt: "2026-06-20T08:31:00.000Z",
        id: "event-2",
        method: "POST",
        path: "/api/logout",
        statusCode: 303,
      },
      {
        activityLabel: "Администратор потребовал смену пароля",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:32:00.000Z",
        id: "event-3",
        method: "POST",
        path: "/api/admin/users/user-1/password-rotation",
        statusCode: 200,
      },
      {
        activityLabel: "Изменение доступа пользователя",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:33:00.000Z",
        id: "event-4",
        method: "POST",
        path: "/api/admin/users/user-1/access",
        statusCode: 200,
      },
      {
        activityLabel: "Удаление пользователя",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:34:00.000Z",
        id: "event-5",
        method: "DELETE",
        path: "/api/admin/users/user-2/delete",
        statusCode: 200,
      },
      {
        activityLabel: "Слияние учётных записей",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:35:00.000Z",
        id: "event-6",
        method: "POST",
        path: "/api/admin/users/source-1/merge",
        statusCode: 200,
      },
      {
        activityLabel: "Изменение email и Telegram",
        actorLabel: "Пользователь: admin",
        createdAt: "2026-06-20T08:36:00.000Z",
        id: "event-7",
        method: "POST",
        path: "/api/admin/users/user-1/identity-link",
        statusCode: 200,
      },
    ]);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("event_type IN"), [100]);
    expect(JSON.stringify(query.mock.calls)).not.toContain("resetToken");
    expect(JSON.stringify(query.mock.calls)).not.toContain("Bearer");
  });
});
