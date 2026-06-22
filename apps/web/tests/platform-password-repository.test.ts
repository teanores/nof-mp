import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformPasswordRepository } from "@/lib/server/platform-password-repository";
import { hashPlatformPassword } from "@/lib/server/platform-password";

const passwordPolicyState = vi.hoisted(() => ({
  clearRotationRequirement: vi.fn(),
}));

vi.mock("@/lib/server/password-policy-state-repository", () => ({
  getPasswordPolicyStateRepository: () => passwordPolicyState,
}));

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

describe("platform password repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("changes the current user's password when the current password and policy are valid", async () => {
    const currentHash = hashPlatformPassword("CurrentHorse1!");
    const pool = new FakePool([{ email: "user@example.com", password_hash: currentHash, username: "teanore" }]);
    const repository = new PlatformPasswordRepository(pool as never);

    await expect(
      repository.changePassword({
        currentPassword: "CurrentHorse1!",
        newPassword: "NextHorse22!",
        userId: "user-1",
      }),
    ).resolves.toEqual({ ok: true });

    expect(pool.queries).toHaveLength(2);
    expect(pool.queries[0]?.sql).toContain("SELECT");
    expect(pool.queries[0]?.sql).toContain('dragon_forge."user"');
    expect(pool.queries[1]?.sql).toContain("UPDATE");
    expect(pool.queries[1]?.values?.[0]).not.toBe("NextHorse22!");
    expect(pool.queries[1]?.values?.[1]).toBe("user-1");
    expect(passwordPolicyState.clearRotationRequirement).toHaveBeenCalledWith("user-1");
  });

  it("rejects invalid current passwords without updating the user row", async () => {
    const pool = new FakePool([{ email: "user@example.com", password_hash: hashPlatformPassword("CurrentHorse1!"), username: "teanore" }]);
    const repository = new PlatformPasswordRepository(pool as never);

    await expect(
      repository.changePassword({
        currentPassword: "WrongHorse1!",
        newPassword: "NextHorse22!",
        userId: "user-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid_current_password" });

    expect(pool.queries).toHaveLength(1);
    expect(passwordPolicyState.clearRotationRequirement).not.toHaveBeenCalled();
  });

  it("rejects weak new passwords without updating the user row", async () => {
    const pool = new FakePool([{ email: "user@example.com", password_hash: hashPlatformPassword("CurrentHorse1!"), username: "teanore" }]);
    const repository = new PlatformPasswordRepository(pool as never);

    await expect(
      repository.changePassword({
        currentPassword: "CurrentHorse1!",
        newPassword: "teanore",
        userId: "user-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "password_policy", errors: expect.arrayContaining(["password_min_length"]) });

    expect(pool.queries).toHaveLength(1);
    expect(passwordPolicyState.clearRotationRequirement).not.toHaveBeenCalled();
  });

  it("rejects unchanged passwords without updating the user row", async () => {
    const pool = new FakePool([{ email: "user@example.com", password_hash: hashPlatformPassword("CurrentHorse1!"), username: "teanore" }]);
    const repository = new PlatformPasswordRepository(pool as never);

    await expect(
      repository.changePassword({
        currentPassword: "CurrentHorse1!",
        newPassword: "CurrentHorse1!",
        userId: "user-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "password_unchanged" });

    expect(pool.queries).toHaveLength(1);
    expect(passwordPolicyState.clearRotationRequirement).not.toHaveBeenCalled();
  });
});
