import { describe, expect, it } from "vitest";

import { SecretRotationRegistryRepository } from "@/lib/server/secret-rotation-registry";

interface FakeQueryResult<T> {
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  constructor(private readonly rows: unknown[] = []) {}

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (sql.includes("SELECT") && sql.includes("secret_rotation_registry")) {
      return { rows: this.rows as T[] };
    }
    return { rows: [] };
  }
}

describe("secret rotation registry repository", () => {
  it("returns metadata-only secret records without values", async () => {
    const pool = new FakePool([
      {
        consumers: ["nof-mp password reset"],
        last_rotated_at: null,
        location_class: "Kubernetes Secret nof-mp-email-secrets",
        next_review_at: "2026-07-01",
        next_rotation_due_at: "2026-07-01",
        owner: "nof-mp",
        purpose: "Password reset email delivery authorization token",
        risk_level: "P0",
        rotation_period_days: 30,
        rotation_status: "needs-rotation",
        runbook_slug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
        secret_name: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
        service_key: "nof-mp",
        source: "manual",
        uat_status: "pending",
      },
    ]);

    const registry = await new SecretRotationRegistryRepository(pool, "nof_platform", () => new Date("2026-06-14T00:00:00.000Z")).listRegistry();

    expect(pool.queries.some((query) => query.sql.includes("CREATE TABLE IF NOT EXISTS nof_platform.secret_rotation_registry"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.secret_rotation_registry"))).toBe(true);
    const seedKeys = pool.queries
      .filter((query) => query.sql.includes("INSERT INTO nof_platform.secret_rotation_registry"))
      .map((query) => `${query.values?.[0]}:${query.values?.[1]}`);
    expect(seedKeys).toEqual(expect.arrayContaining(["nof-tt:NOF_TT_OAUTH_CLIENT_SECRET", "nof-ht:TELEGRAM_HABIT_BOT_TOKEN", "nof-service:SECRET_KEY", "nof-infra:NOF_RELEASE_GITHUB_TOKEN"]));
    expect(registry).toHaveLength(1);
    expect(registry.map((item) => item.secretName)).toContain("NOF_MP_EMAIL_WEBHOOK_TOKEN");
    for (const item of registry) {
      expect(item.source).toBe("manual");
      expect(item.rotationPeriodDays === null || item.rotationPeriodDays > 0).toBe(true);
      expect(item.daysUntilRotation === null || Number.isInteger(item.daysUntilRotation)).toBe(true);
      expect(Object.keys(item)).not.toContain("value");
      expect(Object.keys(item)).not.toContain("hash");
      expect(Object.keys(item)).not.toContain("preview");
      expect(JSON.stringify(item)).not.toMatch(/secret-value|smtp-pass|Bearer /);
    }
  });

  it("calculates rotation deadline from stored metadata", async () => {
    const pool = new FakePool([
      {
        consumers: ["nof-mp OAuth token signer"],
        last_rotated_at: "2026-06-01",
        location_class: "Kubernetes Secret nof-mp-oauth-secrets",
        next_review_at: "2026-07-01",
        next_rotation_due_at: "2026-07-01",
        owner: "nof-mp",
        purpose: "NOF Platform OAuth JWT signing secret",
        risk_level: "P0",
        rotation_period_days: 30,
        rotation_status: "planned",
        runbook_slug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
        secret_name: "NOF_PLATFORM_OAUTH_JWT_SECRET",
        service_key: "nof-mp",
        source: "manual",
        uat_status: "pending",
      },
    ]);

    await expect(new SecretRotationRegistryRepository(pool, "nof_platform", () => new Date("2026-06-14T00:00:00.000Z")).listRegistry()).resolves.toEqual([
      expect.objectContaining({
        daysUntilRotation: 17,
        lastRotatedAt: "2026-06-01",
        nextRotationDueAt: "2026-07-01",
        rotationPeriodDays: 30,
      }),
    ]);
  });
});
