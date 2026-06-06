import { afterEach, describe, expect, it } from "vitest";

import { mcpTokenSchemaName } from "@/lib/server/mcp-token-repository";

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
});

