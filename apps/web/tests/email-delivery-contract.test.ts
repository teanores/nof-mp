import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("NOF-MP email delivery contract", () => {
  const root = join(process.cwd(), "..", "..");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const runbook = readFileSync(join(root, "docs", "runbooks", "password-reset-email-env-contract.md"), "utf8");

  it("documents the approved forgath.ru sender domain for registration and password reset", () => {
    expect(envExample).toContain("NOF_MP_EMAIL_FROM=accounts@forgath.ru");
    expect(runbook).toContain("registration code and password reset delivery");
    expect(runbook).toContain("accounts@forgath.ru");
  });

  it("keeps DNS/provider rollout as an infra-owned gate", () => {
    expect(runbook).toContain("Infrastructure handoff: `NOF-INFRA-21`");
    expect(runbook).toContain("SPF readiness");
    expect(runbook).toContain("DMARC readiness");
  });
});
