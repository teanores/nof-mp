import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = join(__dirname, "..");

describe("email delivery runtime packaging", () => {
  it("keeps nodemailer available in the standalone production image", () => {
    const dockerfile = readFileSync(join(appRoot, "Dockerfile"), "utf8");
    const nextConfig = readFileSync(join(appRoot, "next.config.ts"), "utf8");

    expect(nextConfig).toContain('serverExternalPackages: ["nodemailer"]');
    expect(dockerfile).toContain("/app/node_modules/nodemailer ./node_modules/nodemailer");
  });
});
