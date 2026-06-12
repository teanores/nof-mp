import { describe, expect, it } from "vitest";

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

describe("admin users repository", () => {
  it("lists admin-safe user rows without password hashes", async () => {
    const pool = new FakePool([
      {
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
        createdAt: "2026-06-01T10:00:00.000Z",
        email: "251740038@telegram.forgath.ru",
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
    expect(pool.queries[0]?.sql).not.toContain("password_hash AS");
    expect(pool.queries[0]?.values).toEqual([100]);
  });

  it("loads one admin-safe user row by id without password hashes", async () => {
    const pool = new FakePool([
      {
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
      email: "owner@example.com",
      id: "u-2",
      username: "owner",
    });
    expect(pool.queries[0]?.sql).toContain("WHERE u.id::text = $1");
    expect(pool.queries[0]?.sql).toContain("LIMIT 1");
    expect(pool.queries[0]?.sql).not.toContain("password_hash AS");
    expect(pool.queries[0]?.values).toEqual(["u-2"]);
  });

  it("returns null when an admin user detail row is missing", async () => {
    const repository = new AdminUsersRepository(new FakePool([]) as never);

    await expect(repository.getUserById("missing")).resolves.toBeNull();
  });

  it("marks non-forgath domains as external emails", () => {
    expect(userRisks({ email: "elf@external.invalid", has_password: true })).toEqual(["external-email"]);
    expect(userRisks({ email: "elf@forgath.ru", has_password: true })).toEqual([]);
  });

  it("derives password recovery readiness from email shape", () => {
    expect(userRecoveryState({ email: "owner@example.com" })).toBe("email-reset-ready");
    expect(userRecoveryState({ email: "251740038@telegram.forgath.ru" })).toBe("service-email");
    expect(userRecoveryState({ email: null })).toBe("missing-email");
  });
});
