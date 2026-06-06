import { afterEach, describe, expect, it } from "vitest";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

const envKeys = ["NOF_PLATFORM_DATABASE_URL", "FORGE_TASKS_DATABASE_URL", "DB_SERVER", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASS"];

describe("platform database config", () => {
  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("uses canonical platform database URL when configured", () => {
    process.env.NOF_PLATFORM_DATABASE_URL = "postgresql://platform.example/db";
    process.env.FORGE_TASKS_DATABASE_URL = "postgresql://legacy.example/db";

    expect(platformDatabaseUrl("test context")).toBe("postgresql://platform.example/db");
  });

  it("does not accept the legacy Forge Tasks database URL as a nof-mp runtime fallback", () => {
    process.env.FORGE_TASKS_DATABASE_URL = "postgresql://legacy.example/db";

    expect(() => platformDatabaseUrl("test context")).toThrow("PostgreSQL settings are not configured for test context");
  });

  it("builds a URL from DB_* settings when the canonical URL is absent", () => {
    process.env.DB_SERVER = "db.local";
    process.env.DB_PORT = "15432";
    process.env.DB_NAME = "nof mp";
    process.env.DB_USER = "platform user";
    process.env.DB_PASS = "p@ss word";

    expect(platformDatabaseUrl("test context")).toBe("postgresql://platform%20user:p%40ss%20word@db.local:15432/nof%20mp");
  });
});
