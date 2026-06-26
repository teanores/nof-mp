import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("user reconciliation runbook", () => {
  const runbook = readFileSync(join(process.cwd(), "..", "..", "docs", "runbooks", "user-reconciliation-inventory.md"), "utf8");

  it("documents observed legacy synthetic user-id email placeholders", () => {
    expect(runbook).toContain("user123456forgath.ru");
    expect(runbook).toContain("user123456@forgath.ru");
    expect(runbook).toContain("not be treated as recoverable email");
  });
});
