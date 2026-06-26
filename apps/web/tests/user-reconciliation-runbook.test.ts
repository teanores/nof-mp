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

  it("defines the canonical person plus identity alias target model", () => {
    expect(runbook).toContain("nof_platform.canonical_person");
    expect(runbook).toContain("nof_platform.identity_alias");
    expect(runbook).toContain("nof_platform.identity_alias_event");
    expect(runbook).toContain("nof_platform.person_account_link");
    expect(runbook).toContain("adding an alias must not overwrite another alias");
    expect(runbook).toContain("source accounts are not deleted or denied merely because they were linked");
  });

  it("keeps cross-service reconciliation evidence-first", () => {
    expect(runbook).toContain("nof-mp owns the canonical person and alias registry");
    expect(runbook).toContain("nof-ht and nof-tt keep service-local users");
    expect(runbook).toContain("must not mutate nof-ht or nof-tt directly from nof-mp");
    expect(runbook).toContain("Production data migration");
    expect(runbook).toContain("local Docker-Postgres evidence");
  });
});
