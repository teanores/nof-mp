import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { decodePlatformAuthToken, NofPlatformAuthRepository } from "@/lib/server/platform-auth";

function encodePart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

describe("platform auth token", () => {
  it("decodes the existing Dragon Forge HS256 auth_token shape", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "test-secret");

    expect(decodePlatformAuthToken(token, "test-secret")).toMatchObject({
      sub: "11111111-1111-1111-1111-111111111111",
      username: "teanore",
    });
  });

  it("rejects tokens signed with another secret", () => {
    const token = sign({ sub: "11111111-1111-1111-1111-111111111111", username: "teanore", exp: 4_102_444_800 }, "right-secret");

    expect(decodePlatformAuthToken(token, "wrong-secret")).toBeUndefined();
  });
});

class FakePool {
  constructor(private readonly rows: unknown[]) {}

  async query() {
    return { rows: this.rows };
  }

  async end() {}
}

describe("NOF platform auth repository", () => {
  it("rejects a valid cookie when the account is blocked", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const originalSecret = process.env.SECRET_KEY;
    process.env.SECRET_KEY = "test-secret";
    const token = sign({ sub: userId, username: "blocked", exp: 4_102_444_800 }, "test-secret");
    const repository = new NofPlatformAuthRepository(
      new FakePool([
        {
          about_me: null,
          created_at: "2026-06-01T10:00:00.000Z",
          email: "blocked@forgath.ru",
          experience: 0,
          id: userId,
          is_blocked: true,
          last_seen: "2026-06-01T10:00:00.000Z",
          level_id: null,
          level_name: null,
          level_number: null,
          rank_id: null,
          rank_name: null,
          rank_number: null,
          registration_source: "manual",
          role_display_name: "User",
          role_id: 1,
          role_name: "user",
          telegram_firstname: null,
          telegram_id: null,
          telegram_language_code: null,
          telegram_lastname: null,
          telegram_username: null,
          username: "blocked",
        },
      ]) as never,
    );

    try {
      await expect(repository.sessionFromCookie(token)).resolves.toEqual({ authenticated: false, loginUrl: expect.any(String) });
    } finally {
      process.env.SECRET_KEY = originalSecret;
    }
  });
});
