import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { oauthIssuer, signOAuthJwt } from "@/lib/server/oauth-token-signer";

function decodePart(part: string): unknown {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("oauth token signer", () => {
  it("signs OAuth JWTs with HS256 and configured issuer", () => {
    vi.stubEnv("NOF_PLATFORM_OAUTH_JWT_SECRET", "test-oauth-jwt-secret");
    vi.stubEnv("NOF_PLATFORM_OAUTH_ISSUER", "https://forgath.test");

    const token = signOAuthJwt({
      aud: "nof-tt",
      email_verified: false,
      exp: 1_800_000_300,
      iat: 1_800_000_000,
      iss: oauthIssuer(),
      nonce: "nonce-1",
      scope: "openid email",
      sub: "platform-user-1",
    });
    const [header, payload, signature] = token.split(".");
    const expectedSignature = createHmac("sha256", "test-oauth-jwt-secret")
      .update(`${header}.${payload}`)
      .digest("base64url");

    expect(decodePart(header ?? "")).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decodePart(payload ?? "")).toEqual({
      aud: "nof-tt",
      email_verified: false,
      exp: 1_800_000_300,
      iat: 1_800_000_000,
      iss: "https://forgath.test",
      nonce: "nonce-1",
      scope: "openid email",
      sub: "platform-user-1",
    });
    expect(signature).toBe(expectedSignature);
  });
});
