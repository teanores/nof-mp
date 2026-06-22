import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("auth abuse protection runbook", () => {
  const runbook = readFileSync(join(process.cwd(), "..", "..", "docs", "runbooks", "auth-abuse-protection.md"), "utf8");

  it("documents auth throttling thresholds and safe audit boundaries", () => {
    expect(runbook).toContain("Login");
    expect(runbook).toContain("Password reset request");
    expect(runbook).toContain("Password reset confirm");
    expect(runbook).toContain("SHA-256 email hash");
    expect(runbook).toContain("must never contain passwords");
  });
});
