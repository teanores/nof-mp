import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const runbookPath = join(process.cwd(), "..", "..", "docs", "runbooks", "security-audit-schema-ownership.md");

describe("security audit schema ownership runbook", () => {
  const runbook = readFileSync(runbookPath, "utf8");

  it("documents nof-mp ownership of platform security audit events", () => {
    expect(runbook).toContain("MANUAL-593766A9");
    expect(runbook).toContain("nof_platform");
    expect(runbook).toContain("security_audit_event");
    expect(runbook).toContain("NOF MP must not read the");
    expect(runbook).toContain("tracker database schema");
  });

  it("keeps tracker schema usage out of the normal runtime path", () => {
    expect(runbook).toContain("must not point to");
    expect(runbook).toContain("forge_tasks");
    expect(runbook).toContain("No direct tracker schema reads from NOF MP");
  });
});
