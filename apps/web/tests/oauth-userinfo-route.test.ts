import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("NOF_PLATFORM_OAUTH_JWT_SECRET", "test-oauth-jwt-secret");
vi.stubEnv("NOF_PLATFORM_OAUTH_ISSUER", "https://forgath.ru");

import { GET as userinfo } from "@/app/oauth/userinfo/route";
import { signOAuthJwt } from "@/lib/server/oauth-token-signer";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost/oauth/userinfo", {
    headers: authorization ? { authorization } : {},
  });
}

describe("OIDC userinfo route", () => {
  it("rejects requests without a Bearer token", async () => {
    const response = await userinfo(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_token", ok: false });
  });

  it("returns safe user claims from a valid bearer access token", async () => {
    const token = signOAuthJwt({
      aud: "nof-tt",
      email: "owner@example.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://forgath.ru",
      name: "owner",
      nonce: "nonce-1",
      preferred_username: "owner",
      role: "owner",
      scope: "openid profile email",
      sub: "platform-user-1",
    });

    const response = await userinfo(request(`Bearer ${token}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      email: "owner@example.com",
      email_verified: true,
      name: "owner",
      preferred_username: "owner",
      sub: "platform-user-1",
    });
  });

  it("rejects expired bearer tokens", async () => {
    const token = signOAuthJwt({
      aud: "nof-tt",
      exp: Math.floor(Date.now() / 1000) - 1,
      iat: Math.floor(Date.now() / 1000) - 301,
      iss: "https://forgath.ru",
      nonce: "nonce-1",
      scope: "openid",
      sub: "platform-user-1",
    });

    const response = await userinfo(request(`Bearer ${token}`));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_token", ok: false });
  });
});
