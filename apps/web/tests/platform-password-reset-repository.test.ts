import { describe, expect, it } from "vitest";

import {
  hashPasswordResetToken,
  PlatformPasswordResetRepository,
} from "@/lib/server/platform-password-reset-repository";

interface FakeQueryResult<T> {
  rowCount?: number;
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];
  private readonly results: Array<FakeQueryResult<unknown>>;

  constructor(results: Array<FakeQueryResult<unknown>> = []) {
    this.results = results;
  }

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (sql.includes("CREATE SCHEMA") || sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
      return { rows: [], rowCount: 0 };
    }
    return (this.results.shift() ?? { rows: [], rowCount: 0 }) as FakeQueryResult<T>;
  }
}

function repository(pool: FakePool, now = new Date("2026-06-11T10:00:00.000Z")): PlatformPasswordResetRepository {
  return new PlatformPasswordResetRepository(pool as never, {
    now: () => now,
    tokenFactory: () => "raw-reset-token",
  });
}

describe("platform password reset repository", () => {
  it("creates a hash-only reset token for resettable email accounts", async () => {
    const pool = new FakePool([
      { rows: [{ email: "owner@example.com", id: "00000000-0000-0000-0000-000000000001", username: "owner" }] },
      { rows: [], rowCount: 3 },
      { rows: [], rowCount: 1 },
    ]);

    await expect(repository(pool).requestReset({ email: " Owner@Example.com " })).resolves.toMatchObject({
      ok: true,
      reason: "token_created",
      resetToken: "raw-reset-token",
      userId: "00000000-0000-0000-0000-000000000001",
    });

    const lookup = pool.queries.find((query) => query.sql.includes("lower(email)"));
    expect(lookup?.values).toEqual(["owner@example.com"]);

    const insert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.password_reset_tokens"));
    expect(insert?.values).toContain(hashPasswordResetToken("raw-reset-token"));
    expect(JSON.stringify(insert?.values)).not.toContain("raw-reset-token");
  });

  it("returns a uniform result and does not create a token for missing accounts", async () => {
    const pool = new FakePool([{ rows: [] }]);

    await expect(repository(pool).requestReset({ email: "missing@example.com" })).resolves.toEqual({
      ok: true,
      reason: "missing_or_unresettable",
    });

    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.password_reset_tokens"))).toBe(false);
  });

  it("does not create reset tokens for synthetic telegram placeholder email accounts", async () => {
    for (const email of ["251740038@telegram.example.com", "251740038@telegram.forgath.ru"]) {
      const pool = new FakePool();

      await expect(repository(pool).requestReset({ email })).resolves.toEqual({
        ok: true,
        reason: "missing_or_unresettable",
      });

      expect(pool.queries.some((query) => query.sql.includes("dragon_forge"))).toBe(false);
    }
  });

  it("confirms an unused token, marks it used and stores only a password hash", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            email: "owner@example.com",
            expires_at: new Date("2026-06-11T10:30:00.000Z"),
            id: "10000000-0000-0000-0000-000000000001",
            used_at: null,
            user_id: "00000000-0000-0000-0000-000000000001",
            username: "owner",
          },
        ],
      },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);

    await expect(repository(pool).confirmReset({ newPassword: "NextHorse22!", token: "raw-reset-token" })).resolves.toEqual({ ok: true });

    const select = pool.queries.find((query) => query.sql.includes("WHERE prt.token_hash = $1"));
    expect(select?.values?.[0]).toBe(hashPasswordResetToken("raw-reset-token"));
    expect(JSON.stringify(select?.values)).not.toContain("raw-reset-token");

    const passwordUpdate = pool.queries.find((query) => query.sql.includes('UPDATE dragon_forge."user"'));
    expect(passwordUpdate?.values?.[0]).not.toBe("NextHorse22!");
    expect(passwordUpdate?.values?.[1]).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("rejects replayed or expired tokens without updating the password", async () => {
    const pool = new FakePool([{ rows: [] }]);

    await expect(repository(pool).confirmReset({ newPassword: "NextHorse22!", token: "stale-token" })).resolves.toEqual({
      ok: false,
      reason: "invalid_or_expired_token",
    });

    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
  });

  it("preflights reset tokens without exposing the raw token", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            id: "10000000-0000-0000-0000-000000000001",
          },
        ],
      },
    ]);

    await expect(repository(pool).verifyResetToken({ token: "raw-reset-token" })).resolves.toEqual({ ok: true });

    const select = pool.queries.find((query) => query.sql.includes("FROM nof_platform.password_reset_tokens"));
    expect(select?.values?.[0]).toBe(hashPasswordResetToken("raw-reset-token"));
    expect(JSON.stringify(select?.values)).not.toContain("raw-reset-token");
  });

  it("preflights expired or used reset tokens as invalid", async () => {
    const pool = new FakePool([{ rows: [] }]);

    await expect(repository(pool).verifyResetToken({ token: "stale-token" })).resolves.toEqual({
      ok: false,
      reason: "invalid_or_expired_token",
    });

    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
  });

  it("rejects weak reset passwords before marking the token used", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            email: "owner@example.com",
            expires_at: new Date("2026-06-11T10:30:00.000Z"),
            id: "10000000-0000-0000-0000-000000000001",
            used_at: null,
            user_id: "00000000-0000-0000-0000-000000000001",
            username: "owner",
          },
        ],
      },
    ]);

    await expect(repository(pool).confirmReset({ newPassword: "short", token: "raw-reset-token" })).resolves.toEqual({
      errors: expect.arrayContaining(["password_min_length"]),
      ok: false,
      reason: "password_policy",
    });

    expect(pool.queries.some((query) => query.sql.includes("SET used_at"))).toBe(false);
    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
  });
});
