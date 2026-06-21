import { describe, expect, it, vi } from "vitest";

import { PlatformRegistrationRepository } from "@/lib/server/platform-registration-repository";
import { verifyPlatformPassword } from "@/lib/server/platform-password";

interface QueryRecord {
  sql: string;
  values?: unknown[];
}

class FakeClient {
  public queries: QueryRecord[] = [];

  constructor(private readonly responses: unknown[][]) {}

  async query(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return { rowCount: null, rows: [] };
    }
    return { rowCount: 1, rows: this.responses.shift() ?? [] };
  }

  release = vi.fn();
}

class FakePool {
  public client?: FakeClient;
  public queries: QueryRecord[] = [];

  constructor(
    private readonly responses: unknown[][],
    private readonly clientResponses: unknown[][] = [],
  ) {}

  async query(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });
    return { rowCount: 1, rows: this.responses.shift() ?? [] };
  }

  async connect() {
    this.client = new FakeClient(this.clientResponses);
    return this.client;
  }

  async end() {}
}

function repository(pool: FakePool): PlatformRegistrationRepository {
  return new PlatformRegistrationRepository(pool as never, {
    codeFactory: () => "123456",
    now: () => new Date("2026-06-21T12:00:00.000Z"),
  });
}

describe("platform registration repository", () => {
  it("creates a hash-only pending registration code", async () => {
    const pool = new FakePool([[], [], [], [], [], []]);

    await expect(
      repository(pool).requestRegistration({
        email: " Owner@Example.COM ",
        password: "CorrectHorse123!",
        username: " owner ",
      }),
    ).resolves.toEqual({ code: "123456", email: "owner@example.com", ok: true, reason: "code_created" });

    const insert = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.registration_codes"));
    expect(insert?.values).toHaveLength(5);
    expect(insert?.values).toContain("owner@example.com");
    expect(insert?.values).toContain("owner");
    expect(insert?.values).not.toContain("OwnerLocal123!");
    expect(verifyPlatformPassword("CorrectHorse123!", String(insert?.values?.[2]))).toBe(true);
  });

  it("rejects existing email or username before creating a code", async () => {
    const pool = new FakePool([[], [], [], [{ id: "existing-user" }]]);

    await expect(
      repository(pool).requestRegistration({
        email: "owner@example.com",
        password: "CorrectHorse123!",
        username: "owner",
      }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });

    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO nof_platform.registration_codes"))).toBe(false);
  });

  it("confirms a valid code and creates a user", async () => {
    const pool = new FakePool([[], [], []], [
      [
        {
          attempts: 0,
          code_hash: "placeholder",
          email: "owner@example.com",
          expires_at: new Date("2026-06-21T12:15:00.000Z"),
          id: "00000000-0000-0000-0000-000000000001",
          password_hash: "$pbkdf2-sha256$29000$salt$digest",
          username: "owner",
        },
      ],
      [],
      [],
      [],
    ]);
    const repo = repository(pool);
    const pending = pool.client;
    void pending;

    await repo.requestRegistration({ email: "owner@example.com", password: "CorrectHorse123!", username: "owner" });
    const codeHash = pool.queries.find((query) => query.sql.includes("INSERT INTO nof_platform.registration_codes"))?.values?.[3];
    const confirmPool = new FakePool([[], [], []], [
      [
        {
          attempts: 0,
          code_hash: codeHash,
          email: "owner@example.com",
          expires_at: new Date("2026-06-21T12:15:00.000Z"),
          id: "00000000-0000-0000-0000-000000000001",
          password_hash: "$pbkdf2-sha256$29000$salt$digest",
          username: "owner",
        },
      ],
      [],
      [],
      [],
    ]);

    await expect(repository(confirmPool).confirmRegistration({ code: "123456", email: "owner@example.com" })).resolves.toMatchObject({
      ok: true,
    });
    expect(confirmPool.client?.queries.some((query) => query.sql.includes('INSERT INTO dragon_forge."user"'))).toBe(true);
    expect(confirmPool.client?.queries.some((query) => query.sql.includes("SET used_at"))).toBe(true);
  });
});
