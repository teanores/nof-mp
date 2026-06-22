import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "..",
  "..",
  "scripts",
  "migrations",
  "2026-06-22-nof-mp-23-telegram-placeholder-email-domain.sql",
);

describe("NOF-MP-23 placeholder email domain migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("migrates only numeric Telegram placeholders from example.com to forgath.ru", () => {
    expect(migration).toContain("^[0-9]+@telegram\\.example\\.com$");
    expect(migration).toContain("@telegram.forgath.ru");
    expect(migration).not.toContain("SELECT email");
  });

  it("reports aggregate counts only for production evidence", () => {
    expect(migration).toContain("remaining_telegram_example_placeholder_count");
    expect(migration).toContain("telegram_forgath_placeholder_count");
    expect(migration).toContain("remaining_example_com_count");
  });
});
