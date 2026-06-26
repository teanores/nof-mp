import { describe, expect, it } from "vitest";

import { PlatformProfileRepository } from "@/lib/server/platform-profile-repository";

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

describe("platform profile repository", () => {
  it("updates only safe profile fields for the current user", async () => {
    const pool = new FakePool([
      {
        about_me: "Updated profile",
        id: "user-1",
        username: "Owner",
      },
    ]);
    const repository = new PlatformProfileRepository(pool as never);

    await expect(
      repository.updateOwnProfile({
        aboutMe: "  Updated   profile  ",
        userId: "user-1",
        username: "  Owner  ",
      }),
    ).resolves.toEqual({
      ok: true,
      profile: {
        aboutMe: "Updated profile",
        id: "user-1",
        username: "Owner",
      },
    });

    const update = pool.queries[0];
    expect(update.sql).toContain('UPDATE dragon_forge."user"');
    expect(update.sql).toContain("WHERE id = $1::uuid");
    expect(update.sql).not.toContain("password_hash");
    expect(update.sql).not.toContain("email");
    expect(update.sql).not.toContain("telegram_id");
    expect(update.sql).not.toContain("token");
    expect(update.values).toEqual(["user-1", "Owner", "Updated profile"]);
  });

  it("rejects invalid usernames before writing", async () => {
    const pool = new FakePool();
    const repository = new PlatformProfileRepository(pool as never);

    await expect(repository.updateOwnProfile({ userId: "user-1", username: "x" })).resolves.toEqual({
      ok: false,
      reason: "invalid_username",
    });
    expect(pool.queries).toHaveLength(0);
  });
});
