import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("password rotation policy runbook", () => {
  const runbook = readFileSync(join(process.cwd(), "..", "..", "docs", "runbooks", "password-rotation-policy.md"), "utf8");

  it("documents explicit rotation state and separates ban/delete workflows", () => {
    expect(runbook).toContain("must_rotate_password=true");
    expect(runbook).toContain("does not infer password weakness from password hashes");
    expect(runbook).toContain("NOF-MP-30");
    expect(runbook).toContain("NOF-MP-31");
    expect(runbook).toContain("must not be modeled as a password-rotation flag");
  });
});
