import { describe, expect, it } from "vitest";

import { CanonicalIdentityRepository, canonicalAliasHash, normalizeCanonicalAliasValue } from "@/lib/server/canonical-identity-repository";

interface FakeQueryResult<T> {
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  constructor(private readonly results: unknown[][] = []) {}

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK" || sql.startsWith("CREATE ") || sql.startsWith("INSERT ")) {
      return { rows: [] as T[] };
    }
    return { rows: (this.results.shift() ?? []) as T[] };
  }

  async end(): Promise<void> {}
}

describe("canonical identity repository", () => {
  it("normalizes aliases without mixing Telegram id and username", () => {
    expect(normalizeCanonicalAliasValue("email", " Owner@Example.COM ")).toBe("owner@example.com");
    expect(normalizeCanonicalAliasValue("telegram_id", "251740038")).toBe("251740038");
    expect(normalizeCanonicalAliasValue("telegram_id", "@teanore")).toBe("");
    expect(normalizeCanonicalAliasValue("telegram_username", "@TeAnore")).toBe("teanore");
  });

  it("claims a new alias append-only and links an existing platform account without updating legacy user fields", async () => {
    const pool = new FakePool([[], [{ id: "person-1" }]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    const result = await repository.claimAlias({
      actorUserId: "actor-1",
      aliasKind: "email",
      aliasValue: "Owner@Example.com",
      personId: "person-1",
      platformUserId: "user-1",
      verificationState: "verified",
    });

    expect(result).toMatchObject({ ok: true, personId: "person-1" });
    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(true);
    expect(pool.queries.some((query) => query.sql === "COMMIT")).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias_event"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.person_account_link"))).toBe(true);

    const aliasInsert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias"));
    expect(aliasInsert?.values).toEqual([
      expect.any(String),
      "person-1",
      "email",
      "nof",
      canonicalAliasHash("email", "nof", "owner@example.com"),
      "owner@example.com",
      "verified",
      "actor-1",
    ]);
  });

  it("returns an existing alias for the same person without creating duplicate events", async () => {
    const pool = new FakePool([[{ id: "alias-1", person_id: "person-1" }]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    await expect(
      repository.claimAlias({
        aliasKind: "telegram_username",
        aliasValue: "@TeAnore",
        personId: "person-1",
      }),
    ).resolves.toEqual({ aliasId: "alias-1", ok: true, personId: "person-1" });

    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(false);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias"))).toBe(false);
  });

  it("rejects a live alias already claimed by another canonical person", async () => {
    const pool = new FakePool([[{ id: "alias-1", person_id: "person-1" }]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    await expect(
      repository.claimAlias({
        aliasKind: "email",
        aliasValue: "owner@example.com",
        personId: "person-2",
      }),
    ).resolves.toEqual({ ok: false, reason: "alias_conflict" });

    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(false);
  });

  it("does not expose Telegram numeric identifiers as display values", async () => {
    const pool = new FakePool([[], [{ id: "person-1" }]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    await repository.claimAlias({
      aliasKind: "telegram_id",
      aliasValue: "251740038",
      personId: "person-1",
      verificationState: "verified",
    });

    const aliasInsert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias"));
    expect(aliasInsert?.values?.[5]).toBeNull();
  });
});
