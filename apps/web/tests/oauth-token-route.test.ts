import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redeemState = vi.hoisted(() => ({
  result: {
    ok: true,
    record: {
      clientId: "nof-tt",
      code: "oauth_code_valid",
      expiresAt: "2026-06-04T15:02:00.000Z",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      scopes: ["openid", "profile", "email"],
      state: "state-1",
      usedAt: "2026-06-04T15:00:00.000Z",
    },
  } as unknown,
  calls: [] as unknown[],
}));

vi.mock("@/lib/server/oauth-authorization-code-repository", () => ({
  getOAuthAuthorizationCodeRepository: () => ({
    redeem: async (input: unknown) => {
      redeemState.calls.push(input);
      return redeemState.result;
    },
  }),
}));

import { POST as token } from "@/app/oauth/token/route";

function tokenRequest(body: URLSearchParams): NextRequest {
  return new NextRequest("http://localhost/oauth/token", {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

describe("oauth token route", () => {
  beforeEach(() => {
    redeemState.calls = [];
    redeemState.result = {
      ok: true,
      record: {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "nonce-1",
        platformUserId: "platform-user-1",
        redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
        scopes: ["openid", "profile", "email"],
        state: "state-1",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };
  });

  it("exchanges an authorization code for safe platform claims", async () => {
    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claims: {
        email_verified: false,
        sub: "platform-user-1",
      },
      expires_in: 300,
      scope: "openid profile email",
      token_type: "Bearer",
    });
    expect(redeemState.calls).toEqual([
      {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
      },
    ]);
  });

  it("rejects unsupported grant types before redeeming a code", async () => {
    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          code: "oauth_code_valid",
          grant_type: "password",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "unsupported_grant_type", ok: false });
    expect(redeemState.calls).toEqual([]);
  });

  it("maps replay and expired code redemption failures to invalid_grant", async () => {
    redeemState.result = { error: "already_used", ok: false };

    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_grant", ok: false });
  });

  it("rejects invalid client and redirect URI without redeeming", async () => {
    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://evil.example/callback",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_redirect_uri", ok: false });
    expect(redeemState.calls).toEqual([]);
  });
});
