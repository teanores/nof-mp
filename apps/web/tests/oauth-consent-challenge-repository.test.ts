import { describe, expect, it } from "vitest";

import { InMemoryOAuthConsentChallengeRepository } from "@/lib/server/oauth-consent-challenge-repository";

function repository(now = new Date("2026-06-04T15:00:00.000Z")): InMemoryOAuthConsentChallengeRepository {
  return new InMemoryOAuthConsentChallengeRepository(() => now);
}

describe("oauth consent challenge repository", () => {
  it("issues short-lived challenges bound to a platform user and OAuth request", async () => {
    const repo = repository();

    const record = await repo.issue({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid", "email"],
      state: "state-1",
      ttlSeconds: 120,
    });

    expect(record.challengeId).toMatch(/^oauth_consent_/);
    expect(record.expiresAt).toBe("2026-06-04T15:02:00.000Z");
    expect(record.usedAt).toBeUndefined();
    expect(record).toMatchObject({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid", "email"],
      state: "state-1",
    });
  });

  it("consumes a valid challenge once for the same platform user", async () => {
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

    const first = await repo.consume({ challengeId: record.challengeId, platformUserId: "platform-user-1" });
    const second = await repo.consume({ challengeId: record.challengeId, platformUserId: "platform-user-1" });

    expect(first).toEqual({ ok: true, record: { ...record, usedAt: "2026-06-04T15:00:00.000Z" } });
    expect(second).toEqual({ error: "already_used", ok: false });
  });

  it("rejects missing, expired and platform-user mismatched challenges", async () => {
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

    await expect(repo.consume({ challengeId: "missing", platformUserId: "platform-user-1" })).resolves.toEqual({
      error: "not_found",
      ok: false,
    });
    await expect(repo.consume({ challengeId: record.challengeId, platformUserId: "platform-user-2" })).resolves.toEqual({
      error: "platform_user_mismatch",
      ok: false,
    });
    await expect(expiredRepo.consume({ challengeId: record.challengeId, platformUserId: "platform-user-1" })).resolves.toEqual({
      error: "expired",
      ok: false,
    });
  });
});
