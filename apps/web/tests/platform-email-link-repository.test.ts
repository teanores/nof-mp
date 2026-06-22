import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashEmailLinkToken, PlatformEmailLinkRepository } from "@/lib/server/platform-email-link-repository";

const passwordPolicyState = vi.hoisted(() => ({
  clearRotationRequirement: vi.fn(),
}));

vi.mock("@/lib/server/password-policy-state-repository", () => ({
  getPasswordPolicyStateRepository: () => passwordPolicyState,
}));

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

function repository(pool: FakePool, now = new Date("2026-06-22T10:00:00.000Z")): PlatformEmailLinkRepository {
  return new PlatformEmailLinkRepository(pool as never, {
    now: () => now,
    tokenFactory: () => "raw-email-link-token",
  });
}

describe("platform email link repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a hash-only email link token for a telegram placeholder account", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            email: "251740038@telegram.forgath.ru",
            id: "00000000-0000-0000-0000-000000000001",
            telegram_id: 251740038,
            telegram_username: "teanore",
            username: "teanore",
          },
        ],
      },
      { rows: [], rowCount: 2 },
      { rows: [], rowCount: 1 },
    ]);

    await expect(repository(pool).issueLink({ actorUserId: "admin-1", userId: "00000000-0000-0000-0000-000000000001" })).resolves.toMatchObject({
      expiresAt: new Date("2026-06-22T11:00:00.000Z"),
      ok: true,
      reason: "token_created",
      token: "raw-email-link-token",
      userId: "00000000-0000-0000-0000-000000000001",
    });

    const insert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.email_link_tokens"));
    expect(insert?.values).toContain(hashEmailLinkToken("raw-email-link-token"));
    expect(JSON.stringify(insert?.values)).not.toContain("raw-email-link-token");
  });

  it("does not create email link tokens for accounts without telegram placeholders", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            email: "owner@example.com",
            id: "00000000-0000-0000-0000-000000000001",
            telegram_id: 251740038,
            telegram_username: "teanore",
            username: "owner",
          },
        ],
      },
    ]);

    await expect(repository(pool).issueLink({ actorUserId: "admin-1", userId: "00000000-0000-0000-0000-000000000001" })).resolves.toEqual({
      ok: false,
      reason: "not_telegram_placeholder",
    });

    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.email_link_tokens"))).toBe(false);
  });

  it("consumes an unused token, replaces the placeholder email and sets password login", async () => {
    const pool = new FakePool([
      {
        rows: [
          {
            email: "251740038@telegram.forgath.ru",
            expires_at: new Date("2026-06-22T10:30:00.000Z"),
            id: "10000000-0000-0000-0000-000000000001",
            telegram_id: 251740038,
            used_at: null,
            user_id: "00000000-0000-0000-0000-000000000001",
            username: "teanore",
          },
        ],
      },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);

    await expect(
      repository(pool).confirmLink({
        email: " Owner@Example.COM ",
        newPassword: "NextHorse22!",
        token: "raw-email-link-token",
      }),
    ).resolves.toEqual({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });

    const select = pool.queries.find((query) => query.sql.includes("WHERE elt.token_hash = $1"));
    expect(select?.values?.[0]).toBe(hashEmailLinkToken("raw-email-link-token"));
    expect(JSON.stringify(select?.values)).not.toContain("raw-email-link-token");

    const update = pool.queries.find((query) => query.sql.includes('UPDATE dragon_forge."user"'));
    expect(update?.values?.[0]).toBe("owner@example.com");
    expect(update?.values?.[1]).not.toBe("NextHorse22!");
    expect(update?.values?.[2]).toBe("00000000-0000-0000-0000-000000000001");
    expect(passwordPolicyState.clearRotationRequirement).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
  });
});
