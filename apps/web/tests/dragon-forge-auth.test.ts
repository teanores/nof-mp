import crypto from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeDragonForgeAuthToken } from "@/lib/server/dragon-forge-auth";

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

describe("dragon forge auth token", () => {
  afterEach(() => {
    delete process.env.DRAGON_FORGE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_DRAGON_FORGE_LOGIN_URL;
    delete process.env.SECRET_KEY;
    vi.resetModules();
  });

  it("uses a platform-relative login URL by default", async () => {
    const { dragonForgeLoginUrl } = await import("@/lib/server/dragon-forge-auth");

    expect(dragonForgeLoginUrl).toBe("/login");
    expect(dragonForgeLoginUrl).not.toContain("192.168.1.51");
    expect(dragonForgeLoginUrl).not.toContain("30500");
  });

  it("keeps the configured Dragon Forge login URL override", async () => {
    process.env.NEXT_PUBLIC_DRAGON_FORGE_LOGIN_URL = "https://forgath.ru/login";
    const { dragonForgeLoginUrl } = await import("@/lib/server/dragon-forge-auth");

    expect(dragonForgeLoginUrl).toBe("https://forgath.ru/login");
  });

  it("decodes the existing Dragon Forge HS256 auth_token shape", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "test-secret");

    expect(decodeDragonForgeAuthToken(token, "test-secret")).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("rejects tokens signed with another secret", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "right-secret");

    expect(decodeDragonForgeAuthToken(token, "wrong-secret")).toBeUndefined();
  });

  it("prefers DRAGON_FORGE_SECRET_KEY over the legacy SECRET_KEY fallback", () => {
    process.env.DRAGON_FORGE_SECRET_KEY = "new-purpose-secret";
    process.env.SECRET_KEY = "legacy-shared-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "new-purpose-secret");

    expect(decodeDragonForgeAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("keeps SECRET_KEY as a migration fallback for existing legacy sessions", () => {
    process.env.SECRET_KEY = "legacy-shared-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "legacy-shared-secret");

    expect(decodeDragonForgeAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });
});
