import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("local identity release gate documentation", () => {
  it("requires the local identity gate before account and auth releases", () => {
    const runbook = readRepoFile("docs/local-identity-test-runner.md");

    expect(runbook).toContain("Mandatory release gate");
    expect(runbook).toContain("login, logout, registration, profile, password reset, password change, OAuth, service-link");
    expect(runbook).toContain("just test-identity");
    expect(runbook).toContain("just local-ready");
    expect(runbook).toContain("just smoke-identity");
    expect(runbook).toContain("Do not replace this gate with production UAT");
  });

  it("makes the release briefing prompt mention local identity verification", () => {
    const justfile = readRepoFile("justfile");

    expect(justfile).toContain("5. Local identity gate result for account/auth changes");
    expect(justfile).toContain("Run before account/auth deploy requests:");
    expect(justfile).toContain("just test-identity");
    expect(justfile).toContain("just local-ready");
  });
});
