import { describe, expect, it } from "vitest";

import { signOAuthConsentRecord, verifyOAuthConsentToken } from "@/lib/server/oauth-consent-token";

const record = {
  challengeId: "oauth_consent_test",
  clientId: "nof-tt",
  expiresAt: "2026-06-07T12:10:00.000Z",
  nonce: "nonce-1",
  platformUserId: "platform-user-1",
  redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
  scopes: ["openid", "email"],
  state: "state-1",
};

describe("oauth consent token", () => {
  it("round-trips a signed consent record for the same platform user", () => {
    const token = signOAuthConsentRecord(record, "test-secret");

    expect(verifyOAuthConsentToken(token, "platform-user-1", new Date("2026-06-07T12:00:00.000Z"), "test-secret")).toEqual(record);
  });

  it("rejects tampered, expired and user-mismatched tokens", () => {
    const token = signOAuthConsentRecord(record, "test-secret");
    const tampered = `${token.slice(0, -1)}x`;

    expect(verifyOAuthConsentToken(tampered, "platform-user-1", new Date("2026-06-07T12:00:00.000Z"), "test-secret")).toBeUndefined();
    expect(verifyOAuthConsentToken(token, "platform-user-2", new Date("2026-06-07T12:00:00.000Z"), "test-secret")).toBeUndefined();
    expect(verifyOAuthConsentToken(token, "platform-user-1", new Date("2026-06-07T12:11:00.000Z"), "test-secret")).toBeUndefined();
  });
});
