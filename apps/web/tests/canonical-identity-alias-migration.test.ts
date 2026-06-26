import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "..",
  "..",
  "scripts",
  "migrations",
  "2026-06-26-manual-95eb7a94-canonical-identity-aliases.sql",
);

describe("MANUAL-95EB7A94 canonical identity alias migration", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const normalized = migration.toLowerCase();

  it("creates canonical person, alias, alias event and legacy bridge tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS nof_platform.canonical_person");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS nof_platform.identity_alias");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS nof_platform.identity_alias_event");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS nof_platform.person_account_link");
  });

  it("keeps aliases append-only and globally unique while active", () => {
    expect(migration).toContain("identity_alias_active_unique_idx");
    expect(migration).toContain("WHERE revoked_at IS NULL");
    expect(migration).toContain("alias_kind");
    expect(migration).toContain("alias_value_hash");
    expect(migration).toContain("verification_state");
  });

  it("does not mutate existing platform users in the schema draft", () => {
    expect(normalized).not.toContain("update dragon_forge");
    expect(normalized).not.toContain("delete from dragon_forge");
    expect(normalized).not.toContain("drop table");
    expect(normalized).not.toContain("password_hash");
    expect(normalized).not.toContain("select email");
  });
});
