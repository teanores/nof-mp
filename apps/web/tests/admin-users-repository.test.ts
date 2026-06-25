import { describe, expect, it } from "vitest";

import { summarizeUserReconciliation } from "@/lib/admin-user-reconciliation";
import { AdminUsersRepository, userRecoveryState, userRisks } from "@/lib/server/admin-users-repository";

interface FakeQueryResult<T> {
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  constructor(private readonly rows: unknown[] = []) {}

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    return { rows: this.rows as T[] };
  }
}

class QueuePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  private readonly results: unknown[][];

  constructor(results: unknown[][]) {
    this.results = results.filter((rows) => rows.length > 0);
  }

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (!sql.trimStart().startsWith("SELECT")) {
      return { rows: [] };
    }
    return { rows: (this.results.shift() ?? []) as T[] };
  }
}

describe("admin users repository", () => {
  it("lists admin-safe user rows without password hashes", async () => {
    const pool = new FakePool([
      {
        access_denied: false,
        created_at: "2026-06-01T10:00:00.000Z",
        email: "251740038@telegram.forgath.ru",
        has_password: false,
        id: "u-1",
        last_seen: "2026-06-01T11:00:00.000Z",
        registration_source: "telegram",
        role_display_name: "Администратор",
        role_name: "admin",
        telegram_id: "251740038",
        telegram_username: "teanore",
        username: "teanore",
      },
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(repository.listUsers()).resolves.toEqual([
      {
        accountState: "telegram-only",
        accessState: "active",
        createdAt: "2026-06-01T10:00:00.000Z",
        hasPassword: false,
        id: "u-1",
        lastSeen: "2026-06-01T11:00:00.000Z",
        recoveryState: "service-email",
        registrationSource: "telegram",
        risks: ["missing-password", "telegram-placeholder-email"],
        role: { displayName: "Администратор", name: "admin" },
        telegram: { id: 251740038, username: "teanore" },
        username: "teanore",
      },
    ]);
    const selectQuery = pool.queries.find((query) => query.sql.includes("FROM dragon_forge.\"user\" u"));
    expect(pool.queries.some((query) => query.sql.includes("SET email = NULL"))).toBe(false);
    expect(selectQuery?.sql).not.toContain("password_hash AS");
    expect(selectQuery?.sql).toContain("LEFT JOIN nof_platform.user_access_state access");
    expect(selectQuery?.values).toEqual([100]);
  });

  it("loads one admin-safe user row by id without password hashes", async () => {
    const pool = new FakePool([
      {
        access_denied: true,
        created_at: "2026-06-01T10:00:00.000Z",
        email: "owner@example.com",
        has_password: true,
        id: "u-2",
        last_seen: null,
        registration_source: "email",
        role_display_name: "Администратор",
        role_name: "admin",
        telegram_id: null,
        telegram_username: null,
        username: "owner",
      },
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(repository.getUserById("u-2")).resolves.toMatchObject({
      accountState: "password-login",
      accessState: "denied",
      email: "owner@example.com",
      id: "u-2",
      username: "owner",
    });
    const selectQuery = pool.queries.find((query) => query.sql.includes("WHERE u.id::text = $1"));
    expect(pool.queries.some((query) => query.sql.includes("SET email = NULL"))).toBe(false);
    expect(selectQuery?.sql).toContain("LIMIT 1");
    expect(selectQuery?.sql).not.toContain("password_hash AS");
    expect(selectQuery?.values).toEqual(["u-2"]);
  });

  it("returns null when an admin user detail row is missing", async () => {
    const repository = new AdminUsersRepository(new FakePool([]) as never);

    await expect(repository.getUserById("missing")).resolves.toBeNull();
  });

  it("updates explicit account access state without exposing secrets", async () => {
    const pool = new FakePool([
      {
        access_denied: false,
        created_at: "2026-06-01T10:00:00.000Z",
        email: "owner@example.com",
        has_password: true,
        id: "u-2",
        last_seen: null,
        registration_source: "email",
        role_display_name: "Администратор",
        role_name: "admin",
        telegram_id: null,
        telegram_username: null,
        username: "owner",
      },
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(repository.setAccessState({ actorUserId: "admin-1", denied: true, reason: "admin_review", userId: "u-2" })).resolves.toMatchObject({
      accessState: "active",
      id: "u-2",
    });

    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.user_access_state"))).toBe(true);
    expect(pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.user_access_state"))?.sql).not.toContain("password_hash");
  });

  it("deletes a selected user after cleaning optional platform records", async () => {
    const userRow = {
      access_denied: false,
      created_at: "2026-06-01T10:00:00.000Z",
      email: "test@example.com",
      has_password: true,
      id: "u-2",
      last_seen: null,
      registration_source: "email",
      role_display_name: "Пользователь",
      role_name: "user",
      telegram_id: null,
      telegram_username: null,
      username: "test-user",
    };
    const pool = new QueuePool([
      [],
      [],
      [],
      [],
      [],
      [],
      [userRow],
      [],
      [],
      [{ table_exists: true }],
      [],
      [{ table_exists: false }],
      [{ table_exists: true }],
      [],
      [{ table_exists: true }],
      [],
      [],
      [],
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(repository.deleteUser({ actorUserId: "admin-1", userId: "u-2" })).resolves.toEqual({
      id: "u-2",
      username: "test-user",
    });

    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(true);
    expect(pool.queries.some((query) => query.sql === "COMMIT")).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("DELETE FROM nof_platform.user_access_state"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("DELETE FROM nof_platform.email_link_tokens"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("DELETE FROM nof_platform.mcp_tokens"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("DELETE FROM nof_platform.platform_service_links"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("DELETE FROM dragon_forge.\"user\""))).toBe(true);
    expect(pool.queries.map((query) => query.sql).join("\n")).not.toContain("password_hash AS");
  });

  it("marks a source user as duplicate and moves identity fields to a canonical user", async () => {
    const sourceRow = {
      access_denied: false,
      created_at: "2026-06-01T10:00:00.000Z",
      email: "251740038@telegram.forgath.ru",
      has_password: false,
      id: "source-1",
      last_seen: null,
      registration_source: "telegram",
      role_display_name: "Администратор",
      role_name: "admin",
      telegram_id: "251740038",
      telegram_username: "wrong_admin",
      username: "wrong-admin",
    };
    const targetRow = {
      access_denied: false,
      created_at: "2026-06-02T10:00:00.000Z",
      email: "owner@example.com",
      has_password: true,
      id: "target-1",
      last_seen: null,
      registration_source: "email",
      role_display_name: "Администратор",
      role_name: "admin",
      telegram_id: null,
      telegram_username: null,
      username: "owner",
    };
    const pool = new QueuePool([
      [], [], [],
      [], [], [],
      [], [], [], [sourceRow],
      [], [], [], [targetRow],
      [], [], [], [], [], [], [],
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(
      repository.mergeUserIntoCanonical({
        actorUserId: "admin-1",
        sourceUserId: "source-1",
        targetUserId: "target-1",
      }),
    ).resolves.toEqual({ sourceUserId: "source-1", targetUserId: "target-1" });

    const sql = pool.queries.map((query) => query.sql).join("\n");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS nof_platform.user_identity_merge");
    expect(sql).toContain("UPDATE dragon_forge.\"user\" target");
    expect(sql).toContain("^user[0-9]+@?forgath");
    expect(sql).toContain("INSERT INTO nof_platform.user_access_state");
    expect(sql).toContain("duplicate_merged");
    expect(sql).not.toContain("password_hash AS");
    expect(sql).not.toContain("token");
  });

  it("updates real email and Telegram identity fields for a selected user", async () => {
    const userRow = {
      access_denied: false,
      created_at: "2026-06-01T10:00:00.000Z",
      email: "owner@example.com",
      has_password: true,
      id: "u-2",
      last_seen: null,
      registration_source: "email",
      role_display_name: "Пользователь",
      role_name: "user",
      telegram_id: "251740038",
      telegram_username: "teanore",
      username: "owner",
    };
    const pool = new QueuePool([
      [], [], [],
      [], [], [], [userRow],
      [],
      [], [], [], [userRow],
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(
      repository.updateUserIdentityLink({
        actorUserId: "admin-1",
        email: "owner@example.com",
        telegramId: 251740038,
        telegramUsername: "teanore",
        userId: "u-2",
      }),
    ).resolves.toMatchObject({
      email: "owner@example.com",
      telegram: { id: 251740038, username: "teanore" },
    });

    const sql = pool.queries.map((query) => query.sql).join("\n");
    expect(sql).toContain("UPDATE dragon_forge.\"user\"");
    expect(sql).toContain("telegram_id");
    expect(sql).toContain("telegram_username");
    expect(sql).not.toContain("password_hash AS");
    expect(sql).not.toContain("token");
  });

  it("marks non-forgath domains as external emails", () => {
    expect(userRisks({ email: "elf@external.invalid", has_password: true })).toEqual(["external-email"]);
    expect(userRisks({ email: "elf@forgath.ru", has_password: true })).toEqual([]);
  });

  it("derives password recovery readiness from email shape", () => {
    expect(userRecoveryState({ email: "owner@example.com" })).toBe("email-reset-ready");
    expect(userRecoveryState({ email: "251740038@telegram.example.com" })).toBe("service-email");
    expect(userRecoveryState({ email: "251740038@telegram.forgath.ru" })).toBe("service-email");
    expect(userRecoveryState({ email: "1000320432telegram.forgath.ru" })).toBe("service-email");
    expect(userRecoveryState({ email: "user614815689forgath.ru" })).toBe("service-email");
    expect(userRecoveryState({ email: "user614815689@forgath.ru" })).toBe("service-email");
    expect(userRecoveryState({ email: null })).toBe("missing-email");
  });

  it("marks telegram placeholder domains as service-email risks", () => {
    expect(userRisks({ email: "251740038@telegram.example.com", has_password: true })).toEqual([
      "external-email",
      "telegram-placeholder-email",
    ]);
    expect(userRisks({ email: "251740038@telegram.forgath.ru", has_password: true })).toEqual(["telegram-placeholder-email"]);
    expect(userRisks({ email: "1000320432telegram.forgath.ru", has_password: true })).toEqual([
      "external-email",
      "telegram-placeholder-email",
    ]);
    expect(userRisks({ email: "user614815689forgath.ru", has_password: true })).toEqual([
      "external-email",
      "telegram-placeholder-email",
    ]);
    expect(userRisks({ email: "user614815689@forgath.ru", has_password: true })).toEqual(["telegram-placeholder-email"]);
  });

  it("does not expose legacy user-id synthetic email or mixed Telegram identity fields", async () => {
    const pool = new FakePool([
      {
        access_denied: false,
        created_at: "2026-06-01T10:00:00.000Z",
        email: "user614815689@forgath.ru",
        has_password: false,
        id: "u-legacy",
        last_seen: null,
        registration_source: null,
        role_display_name: null,
        role_name: null,
        telegram_id: "@legacy_username",
        telegram_username: "@clean_me",
        username: "legacy",
      },
    ]);
    const repository = new AdminUsersRepository(pool as never);

    await expect(repository.listUsers()).resolves.toMatchObject([
      {
        id: "u-legacy",
        registrationSource: "telegram",
        recoveryState: "service-email",
        risks: ["missing-password", "telegram-placeholder-email"],
        telegram: { username: "clean_me" },
      },
    ]);
    await expect(repository.listUsers()).resolves.not.toMatchObject([
      {
        email: "user614815689@forgath.ru",
        telegram: { id: expect.anything() },
      },
    ]);
  });

  it("summarizes a read-only reconciliation inventory for nof-mp and nof-ht alignment", () => {
    expect(
      summarizeUserReconciliation([
        {
          accountState: "telegram-only",
          accessState: "active",
          email: "251740038@telegram.forgath.ru",
          hasPassword: false,
          id: "u-1",
          recoveryState: "service-email",
          registrationSource: "telegram",
          risks: ["missing-password", "telegram-placeholder-email"],
          telegram: { id: 251740038, username: "teanore" },
          username: "teanore",
        },
        {
          accountState: "password-login",
          accessState: "denied",
          email: "wrong-admin@forgath.ru",
          hasPassword: true,
          id: "u-2",
          recoveryState: "email-reset-ready",
          registrationSource: "dev",
          risks: [],
          role: { displayName: "Администратор", name: "admin" },
          username: "wrong-admin",
        },
        {
          accountState: "password-login",
          accessState: "active",
          email: "owner@example.com",
          hasPassword: true,
          id: "u-3",
          recoveryState: "email-reset-ready",
          risks: ["external-email"],
          telegram: { id: 100 },
          username: "owner",
        },
      ]),
    ).toEqual({
      deniedUsers: 1,
      duplicateOrDevCandidates: 1,
      manualReviewUsers: 2,
      nofHtMatchReadyUsers: 2,
      realEmailUsers: 2,
      serviceEmailUsers: 1,
      telegramOnlyUsers: 1,
      totalUsers: 3,
    });
  });
});
