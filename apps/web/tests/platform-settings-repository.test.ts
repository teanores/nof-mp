import { describe, expect, it } from "vitest";

import { PlatformSettingsRepository } from "@/lib/server/platform-settings-repository";

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];
  value: unknown | undefined;

  async query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[] }> {
    this.queries.push({ sql, values });
    if (sql.includes("SELECT value")) {
      return { rows: this.value === undefined ? [] : ([{ value: this.value }] as T[]) };
    }
    if (sql.includes("INSERT INTO nof_platform.platform_settings") && values?.[0] === "registration_paused") {
      this.value = JSON.parse(String(values[1]));
    }
    return { rows: [] };
  }
}

describe("platform settings repository", () => {
  it("defaults registration to paused", async () => {
    const pool = new FakePool();
    const repository = new PlatformSettingsRepository(pool, "nof_platform");

    await expect(repository.isRegistrationPaused()).resolves.toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("CREATE TABLE IF NOT EXISTS nof_platform.platform_settings"))).toBe(true);
  });

  it("stores the registration pause flag as JSON metadata", async () => {
    const pool = new FakePool();
    const repository = new PlatformSettingsRepository(pool, "nof_platform");

    await expect(repository.setRegistrationPaused(false, "admin-1")).resolves.toEqual({ registrationPaused: false });
    await expect(repository.isRegistrationPaused()).resolves.toBe(false);
    expect(pool.queries.some((query) => query.values?.[2] === "admin-1")).toBe(true);
  });
});
