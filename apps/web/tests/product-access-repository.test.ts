import { describe, expect, it } from "vitest";

import { ProductAccessRepository, subjectFromPortalSession } from "@/lib/server/product-access-repository";

interface FakeQueryResult<T> {
  rows: T[];
}

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  constructor(private readonly rows: unknown[] = []) {}

  async query<T>(sql: string, values?: unknown[]): Promise<FakeQueryResult<T>> {
    this.queries.push({ sql, values });
    if (sql.includes("SELECT") && sql.includes("products")) {
      return { rows: this.rows as T[] };
    }
    return { rows: [] };
  }

  valuesFor(sqlPart: string): unknown[][] {
    return this.queries.filter((query) => query.sql.includes(sqlPart)).map((query) => query.values ?? []);
  }
}

describe("product access repository", () => {
  it("lists products with access decisions for guests", async () => {
    const repository = ProductAccessRepository.fromStaticRegistry();

    await expect(repository.listForSubject({ role: "guest" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "nof-cb", access: { allowed: false, reason: "authentication-required" } }),
        expect.objectContaining({ key: "nof-tt", access: { allowed: false, reason: "authentication-required" } }),
      ]),
    );
  });

  it("checks project existence from the repository source", async () => {
    const repository = ProductAccessRepository.fromStaticRegistry();

    await expect(repository.exists("nof-ht")).resolves.toBe(true);
    await expect(repository.exists("unknown-product")).resolves.toBe(false);
  });

  it("lists products from database rows with access decisions", async () => {
    const pool = new FakePool([
      {
        allowed_roles: ["partner"],
        created_at: "2026-05-28T00:00:00.000Z",
        description: "Private course portal",
        invited_user_ids: ["u-2"],
        key: "nof-onw",
        name: "Орден Нейронного Пути",
        owner_user_ids: [],
        status: "active",
        visibility: "invited",
      },
    ]);
    const repository = ProductAccessRepository.fromDatabase(pool, "nof_platform");

    await expect(repository.listForSubject({ role: "user", userId: "u-1" })).resolves.toEqual([
      expect.objectContaining({ key: "nof-onw", access: { allowed: false, reason: "invitation-required" } }),
    ]);
    await expect(repository.listForSubject({ role: "user", userId: "u-2" })).resolves.toEqual([
      expect.objectContaining({ key: "nof-onw", access: { allowed: true, reason: "invited-user" } }),
    ]);
    await expect(repository.listForSubject({ role: "partner", userId: "u-3" })).resolves.toEqual([
      expect.objectContaining({ key: "nof-onw", access: { allowed: true, reason: "role-granted" } }),
    ]);
    expect(pool.queries.some((query) => query.sql.includes("CREATE TABLE IF NOT EXISTS nof_platform.products"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("CREATE TABLE IF NOT EXISTS nof_platform.product_access"))).toBe(true);
    expect(pool.queries.some((query) => query.sql.includes("ORDER BY p.key ASC"))).toBe(true);
  });

  it("seeds the default platform products into database tables", async () => {
    const pool = new FakePool();
    const repository = ProductAccessRepository.fromDatabase(pool, "nof_platform");

    await repository.knownProjectKeys();

    const productSeeds = pool.valuesFor("INSERT INTO nof_platform.products");
    const accessSeeds = pool.valuesFor("INSERT INTO nof_platform.product_access");
    expect(productSeeds.map((values) => values[0])).toEqual(["nof-tt", "nof-ht", "nof-cb", "nof-onw"]);
    expect(productSeeds.map((values) => values[4])).toEqual(["registered", "registered", "invited", "invited"]);
    expect(accessSeeds.map((values) => values[0])).toEqual(["nof-tt", "nof-ht", "nof-cb", "nof-onw"]);
    expect(accessSeeds.find((values) => values[0] === "nof-cb")?.[3]).toEqual(["partner"]);
  });

  it("checks database-backed project existence", async () => {
    const pool = new FakePool([{ exists: true }]);
    const repository = ProductAccessRepository.fromDatabase(pool, "nof_platform");

    await expect(repository.exists("nof-tt")).resolves.toBe(true);
    expect(pool.queries.at(-1)).toMatchObject({ values: ["nof-tt"] });
  });

  it("builds an access subject from an authenticated portal session", () => {
    expect(
      subjectFromPortalSession({
        authenticated: true,
        loginUrl: "/login",
        user: {
          id: "u-admin",
          username: "admin",
          experience: 0,
          role: { id: 1, name: "admin" },
        },
      }),
    ).toEqual({ role: "admin", userId: "u-admin" });
  });

  it("treats missing sessions as guests", () => {
    expect(subjectFromPortalSession({ authenticated: false, loginUrl: "/login" })).toEqual({ role: "guest" });
  });
});
