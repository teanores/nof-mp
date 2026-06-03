import { afterEach, describe, expect, it } from "vitest";

import { mcpTokenSchemaName } from "@/lib/server/mcp-token-repository";

describe("mcp token repository", () => {
  afterEach(() => {
    delete process.env.FORGE_TASKS_DB_SCHEMA;
    delete process.env.NOF_PLATFORM_MCP_DB_SCHEMA;
    delete process.env.NOF_PLATFORM_DB_SCHEMA;
  });

  it("uses the Forge Tasks schema by default because the public MCP endpoint is owned by Forge Tasks", () => {
    expect(mcpTokenSchemaName()).toBe("forge_tasks");
  });

  it("allows explicit schema overrides for controlled migrations", () => {
    process.env.FORGE_TASKS_DB_SCHEMA = "forge_tasks_preview";

    expect(mcpTokenSchemaName()).toBe("forge_tasks_preview");
  });
});

