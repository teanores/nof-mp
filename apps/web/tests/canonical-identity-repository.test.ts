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

  it("claims a platform user alias batch in one transaction", async () => {
    const pool = new FakePool([[]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    const result = await repository.claimAliasesForPlatformUser({
      actorUserId: "actor-1",
      aliases: [
        { aliasKind: "email", aliasValue: "Owner@Example.com", verificationState: "unverified" },
        { aliasKind: "telegram_id", aliasProvider: "telegram", aliasValue: "251740038", verificationState: "unverified" },
      ],
      platformUserId: "user-1",
    });

    expect(result).toMatchObject({ ok: true, personId: expect.any(String) });
    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(true);
    expect(pool.queries.some((query) => query.sql === "COMMIT")).toBe(true);
    expect(pool.queries.filter((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias\n"))).toHaveLength(3);
    expect(pool.queries.some((query) => query.sql.includes("'link'"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
  });

  it("rejects conflicting aliases before opening a write transaction", async () => {
    const pool = new FakePool([
      [
        {
          alias_kind: "email",
          alias_provider: "nof",
          alias_value_hash: "hash-1",
          id: "alias-1",
          person_id: "person-1",
        },
        {
          alias_kind: "telegram_id",
          alias_provider: "telegram",
          alias_value_hash: "hash-2",
          id: "alias-2",
          person_id: "person-2",
        },
      ],
    ]);
    const repository = new CanonicalIdentityRepository(pool as never);

    await expect(
      repository.claimAliasesForPlatformUser({
        aliases: [
          { aliasKind: "email", aliasValue: "owner@example.com" },
          { aliasKind: "telegram_id", aliasProvider: "telegram", aliasValue: "251740038" },
        ],
        platformUserId: "user-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "alias_conflict" });

    expect(pool.queries.some((query) => query.sql === "BEGIN")).toBe(false);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias\n"))).toBe(false);
  });

  it("reconciles a canonical platform user with extra alias accounts without mutating legacy users", async () => {
    const pool = new FakePool([[], [], [{ id: "person-1" }], [], [{ id: "person-1" }]]);
    const repository = new CanonicalIdentityRepository(pool as never);

    const result = await repository.reconcilePlatformUsers({
      actorUserId: "actor-1",
      canonicalPlatformUserId: "email-user",
      users: [
        {
          aliases: [{ aliasKind: "email", aliasValue: "Owner@Example.com", verificationState: "verified" }],
          platformUserId: "email-user",
        },
        {
          aliases: [{ aliasKind: "telegram_id", aliasProvider: "telegram", aliasValue: "251740038" }],
          platformUserId: "telegram-user",
        },
        {
          aliases: [{ aliasKind: "telegram_username", aliasProvider: "telegram", aliasValue: "@teanore" }],
          platformUserId: "extra-user",
        },
      ],
    });

    expect(result).toMatchObject({ linkedUserIds: ["email-user", "telegram-user", "extra-user"], ok: true, personId: expect.any(String) });
    expect(pool.queries.filter((query) => query.sql.includes("INSERT INTO nof_platform.person_account_link"))).toHaveLength(3);
    expect(pool.queries.filter((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias_event") && query.sql.includes("'link'"))).toHaveLength(3);
    expect(pool.queries.some((query) => query.sql.includes('UPDATE dragon_forge."user"'))).toBe(false);
  });

  it("requires the canonical user to be part of the selected reconciliation set", async () => {
    const repository = new CanonicalIdentityRepository(new FakePool() as never);

    await expect(
      repository.reconcilePlatformUsers({
        canonicalPlatformUserId: "missing-user",
        users: [
          { aliases: [], platformUserId: "user-1" },
          { aliases: [], platformUserId: "user-2" },
        ],
      }),
    ).resolves.toEqual({ ok: false, reason: "canonical_user_required" });
  });

  it("lists and unlinks platform account links with an immutable unlink event", async () => {
    const pool = new FakePool([
      [{ person_id: "person-1" }],
      [{ platform_user_id: "user-1" }, { platform_user_id: "user-2" }],
      [{ person_id: "person-1" }],
    ]);
    const repository = new CanonicalIdentityRepository(pool as never);

    await expect(repository.listLinkedPlatformUserIds("user-1")).resolves.toEqual({
      personId: "person-1",
      platformUserIds: ["user-1", "user-2"],
    });
    await expect(repository.unlinkPlatformUser({ actorUserId: "actor-1", personId: "person-1", platformUserId: "user-2" })).resolves.toEqual({
      ok: true,
      personId: "person-1",
      platformUserId: "user-2",
    });
    expect(pool.queries.some((query) => query.sql.includes("UPDATE nof_platform.person_account_link"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.identity_alias_event") && query.sql.includes("'unlink'"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes('DELETE FROM dragon_forge."user"'))).toBe(false);
  });
});
