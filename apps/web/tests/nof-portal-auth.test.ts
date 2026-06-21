import crypto from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { decodeNofAuthToken } from "@/lib/server/nof-portal-auth";

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

describe("nof portal auth token", () => {
  afterEach(() => {
    delete process.env.NOF_AUTH_SECRET_KEY;
    delete process.env.NOF_AUTH_SECRET_KEY_PREVIOUS;
    delete process.env.NEXT_PUBLIC_NOF_LOGIN_URL;
    delete process.env.SECRET_KEY;
    delete process.env.SECRET_KEY_PREVIOUS;
    vi.resetModules();
  });

  it("uses a platform-relative login URL by default", async () => {
    const { NOF_LOGIN_URL } = await import("@/lib/server/nof-portal-auth");

    expect(NOF_LOGIN_URL).toBe("/login");
    expect(NOF_LOGIN_URL).not.toContain("192.168.1.51");
    expect(NOF_LOGIN_URL).not.toContain("30500");
  });

  it("keeps the configured NOF login URL override", async () => {
    process.env.NEXT_PUBLIC_NOF_LOGIN_URL = "https://forgath.ru/login";
    const { NOF_LOGIN_URL } = await import("@/lib/server/nof-portal-auth");

    expect(NOF_LOGIN_URL).toBe("https://forgath.ru/login");
  });

  it("decodes the existing HS256 auth_token shape", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "test-secret");

    expect(decodeNofAuthToken(token, "test-secret")).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("rejects tokens signed with another secret", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "right-secret");

    expect(decodeNofAuthToken(token, "wrong-secret")).toBeUndefined();
  });

  it("accepts auth tokens signed with NOF_AUTH_SECRET_KEY during rotation", () => {
    process.env.NOF_AUTH_SECRET_KEY = "new-purpose-secret";
    process.env.SECRET_KEY = "legacy-shared-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "new-purpose-secret");

    expect(decodeNofAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("also accepts auth tokens signed with legacy SECRET_KEY during the dual-key rotation window", () => {
    process.env.NOF_AUTH_SECRET_KEY = "new-purpose-secret";
    process.env.SECRET_KEY = "legacy-shared-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "legacy-shared-secret");

    expect(decodeNofAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("keeps SECRET_KEY as a migration fallback when the new variable is not set", () => {
    process.env.SECRET_KEY = "legacy-shared-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "legacy-shared-secret");

    expect(decodeNofAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("accepts the previous legacy SECRET_KEY during a runtime secret rotation window", () => {
    process.env.SECRET_KEY = "new-legacy-secret";
    process.env.SECRET_KEY_PREVIOUS = "old-legacy-secret";
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "old-legacy-secret");

    expect(decodeNofAuthToken(token)).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });
});
