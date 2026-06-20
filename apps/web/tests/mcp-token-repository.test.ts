import { afterEach, describe, expect, it } from "vitest";

import { McpTokenRepository, mcpTokenSchemaName } from "@/lib/server/mcp-token-repository";

class FakePool {
  readonly queries: Array<{ sql: string; values?: unknown[] }> = [];

  async query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number }> {
    this.queries.push({ sql, values });
    if (sql.includes("SELECT EXISTS") && sql.includes("forge_tasks.projects")) {
      return { rows: [{ exists: values?.[0] === "nof-infra" }] as T[] };
    }
    if (sql.includes("FROM forge_tasks.projects") && sql.includes("ORDER BY key ASC")) {
      return {
        rows: [
          {
            created_at: "2026-06-20T00:00:00.000Z",
            description: "Infrastructure",
            key: "nof-infra",
            name: "NOF Infrastructure",
            status: "active",
          },
          {
            created_at: "2026-06-20T00:00:00.000Z",
            description: "Streamer portal",
            key: "nof-sp",
            name: "NOF Streamer Portal",
            status: "active",
          },
        ] as T[],
      };
    }
    if (sql.includes("INSERT INTO forge_tasks.mcp_tokens")) {
      return {
        rows: [
          {
            created_at: "2026-06-20T00:00:00.000Z",
            id: "token-1",
            last_used_at: null,
            name: values?.[3],
            project_key: values?.[2],
            revoked_at: null,
            scopes: values?.[6],
            token_prefix: values?.[5],
          },
        ] as T[],
      };
    }
    return { rows: [] };
  }
}

describe("mcp token repository", () => {
  afterEach(() => {
    delete process.env.NOF_PLATFORM_MCP_DB_SCHEMA;
    delete process.env.NOF_PLATFORM_DB_SCHEMA;
  });

  it("uses the tracker schema by default because the public MCP endpoint is owned by Task Tracker", () => {
    expect(mcpTokenSchemaName()).toBe("forge_tasks");
  });

  it("allows explicit schema overrides for controlled migrations", () => {
    process.env.NOF_PLATFORM_MCP_DB_SCHEMA = "forge_tasks_preview";

    expect(mcpTokenSchemaName()).toBe("forge_tasks_preview");
  });

  it("uses platform schema override only when no MCP-specific schema is configured", () => {
    process.env.NOF_PLATFORM_DB_SCHEMA = "nof_platform";

    expect(mcpTokenSchemaName()).toBe("nof_platform");
  });

  it("validates token project keys through tracker projects", async () => {
    const pool = new FakePool();
    const repository = new McpTokenRepository(pool as never, "forge_tasks");

    const result = await repository.create("user-1", { name: "NOF Infra", projectKey: "nof-infra" });

    expect(pool.queries.some((query) => query.sql.includes("SELECT EXISTS") && query.values?.[0] === "nof-infra")).toBe(true);
    expect(result.token).toMatchObject({ name: "NOF Infra", projectKey: "nof-infra" });
    expect(result.fullToken).toMatch(/^nof_infra_mcp_/);
    expect(pool.queries.some((query) => query.values?.[2] === "nof-infra")).toBe(true);
  });

  it("lists tracker projects sorted by key for token issuance UI", async () => {
    const pool = new FakePool();
    const repository = new McpTokenRepository(pool as never, "forge_tasks");

    const projects = await repository.listProjectsForTokenIssuer({ role: "user", userId: "user-1" });

    expect(projects.map((project) => project.key)).toEqual(["nof-infra", "nof-sp"]);
    expect(projects[0]).toMatchObject({
      access: { allowed: true, reason: "registered-user" },
      visibility: "registered",
    });
    expect(pool.queries.some((query) => query.sql.includes("FROM forge_tasks.projects") && query.sql.includes("ORDER BY key ASC"))).toBe(true);
  });
});

