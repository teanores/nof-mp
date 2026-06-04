import { describe, expect, it } from "vitest";

import { InMemoryOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";

function repository(now = new Date("2026-06-04T15:00:00.000Z")): InMemoryOAuthAuthorizationCodeRepository {
  return new InMemoryOAuthAuthorizationCodeRepository(() => now);
}

describe("oauth authorization code repository", () => {
  it("issues single-use authorization codes with ttl and OAuth request metadata", async () => {
    const repo = repository();

    const record = await repo.issue({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid", "profile"],
      state: "state-1",
      ttlSeconds: 120,
    });

    expect(record.code).toMatch(/^oauth_code_/);
    expect(record.expiresAt).toBe("2026-06-04T15:02:00.000Z");
    expect(record.usedAt).toBeUndefined();
    expect(record).toMatchObject({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid", "profile"],
      state: "state-1",
    });
  });

  it("redeems a valid code once", async () => {
    const repo = repository();
    const record = await repo.issue({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid"],
      state: "state-1",
      ttlSeconds: 120,
    });

    const first = await repo.redeem({
      clientId: "nof-tt",
      code: record.code,
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
    });
    const second = await repo.redeem({
      clientId: "nof-tt",
      code: record.code,
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
    });

    expect(first).toEqual({ ok: true, record: { ...record, usedAt: "2026-06-04T15:00:00.000Z" } });
    expect(second).toEqual({ error: "already_used", ok: false });
  });

  it("rejects expired, wrong-client and wrong-redirect redemption attempts", async () => {
    const repo = repository(new Date("2026-06-04T15:00:00.000Z"));
    const expiredRepo = repository(new Date("2026-06-04T15:03:00.000Z"));
    const record = await repo.issue({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid"],
      state: "state-1",
      ttlSeconds: 120,
    });

    expiredRepo.importRecord(record);

    await expect(
      repo.redeem({
        clientId: "nof-ht",
        code: record.code,
        redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      }),
    ).resolves.toEqual({ error: "client_mismatch", ok: false });
    await expect(
      repo.redeem({
        clientId: "nof-tt",
        code: record.code,
        redirectUri: "https://evil.example/auth/platform/callback",
      }),
    ).resolves.toEqual({ error: "redirect_uri_mismatch", ok: false });
    await expect(
      expiredRepo.redeem({
        clientId: "nof-tt",
        code: record.code,
        redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      }),
    ).resolves.toEqual({ error: "expired", ok: false });
  });

  it("does not expose secrets in issued authorization code records", async () => {
    const record = await repository().issue({
      clientId: "nof-ht",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://habit-tracker.forgath.ru/auth/platform/callback",
      scopes: ["openid", "email"],
      state: "state-1",
      ttlSeconds: 120,
    });

    expect(record).not.toHaveProperty("clientSecret");
    expect(record).not.toHaveProperty("token");
    expect(record).not.toHaveProperty("password");
  });
});
