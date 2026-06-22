import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const roots = ["app", "components", "lib"].map((folder) => path.join(process.cwd(), folder));
const forbiddenPatterns = [
  /api\.telegram\.org/i,
  /process\.env\.[A-Z0-9_]*TELEGRAM[A-Z0-9_]*/i,
  /process\.env\.[A-Z0-9_]*BOT_TOKEN[A-Z0-9_]*/i,
  /node-telegram-bot-api/i,
  /telegraf/i,
];
const allowedFiles = new Set([path.normalize(path.join(process.cwd(), "components", "AdminSecretsPage.tsx"))]);

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("NOF messenger gateway boundary", () => {
  it("keeps nof-mp free of direct Telegram API calls and bot credentials", () => {
    const violations = roots
      .flatMap(listSourceFiles)
      .filter((file) => !allowedFiles.has(path.normalize(file)))
      .flatMap((file) => {
        const text = fs.readFileSync(file, "utf8");
        return forbiddenPatterns.filter((pattern) => pattern.test(text)).map((pattern) => `${path.relative(process.cwd(), file)} matched ${pattern}`);
      });

    expect(violations).toEqual([]);
  });
});
