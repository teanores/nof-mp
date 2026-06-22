import { describe, expect, it } from "vitest";

import { PasswordPolicyStateRepository } from "@/lib/server/password-policy-state-repository";

interface FakeQueryResult<T> {
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];
  constructor(private readonly rows: unknown[] = []) {}

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (sql.includes("CREATE SCHEMA") || sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
      return { rows: [] };
    }
    return { rows: this.rows as T[] };
  }
}

describe("password policy state repository", () => {
  it("reads explicit password rotation state without inspecting password hashes", async () => {
    const pool = new FakePool([{ must_rotate_password: true, reason: "legacy_weak_password" }]);
    const repository = new PasswordPolicyStateRepository(pool as never, "nof_platform");

    await expect(repository.stateForUser("user-1")).resolves.toEqual({
      mustRotatePassword: true,
      reason: "legacy_weak_password",
    });

    expect(JSON.stringify(pool.queries)).not.toContain("password_hash");
  });

  it("clears rotation after a successful password reset or change", async () => {
    const pool = new FakePool();
    const repository = new PasswordPolicyStateRepository(pool as never, "nof_platform");

    await repository.clearRotationRequirement("user-1");

    const upsert = pool.queries.find((query) => query.sql.includes("must_rotate_password = false"));
    expect(upsert?.values).toEqual(["user-1"]);
  });

  it("marks an explicit user for rotation without printing user data", async () => {
    const pool = new FakePool();
    const repository = new PasswordPolicyStateRepository(pool as never, "nof_platform");

    await repository.requireRotation({ reason: "legacy_weak_password", userId: "user-1" });

    const upsert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.password_policy_state"));
    expect(upsert?.values).toEqual(["user-1", "legacy_weak_password"]);
  });
});
