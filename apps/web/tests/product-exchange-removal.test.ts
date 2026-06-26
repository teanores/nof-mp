import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = resolve(process.cwd());

describe("legacy product exchange bridge removal", () => {
  it("does not ship the old product-exchange API routes or px repository", () => {
    expect(existsSync(resolve(webRoot, "app", "api", "auth", "product-exchange", "issue", "route.ts"))).toBe(false);
    expect(existsSync(resolve(webRoot, "app", "api", "auth", "product-exchange", "redeem", "route.ts"))).toBe(false);
    expect(existsSync(resolve(webRoot, "lib", "server", "product-exchange-repository.ts"))).toBe(false);
  });
});
