import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  values: {
    NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT:
      "bd44784944c8c62f639d7340f7020b75666e9554e788638a5df0b29b3b024c8e",
    NOF_PLATFORM_OAUTH_JWT_SECRET: "test-oauth-jwt-secret",
  },
}));

const redeemState = vi.hoisted(() => ({
  result: {
    ok: true,
    record: {
      clientId: "nof-tt",
      code: "oauth_code_valid",
      expiresAt: "2026-06-04T15:02:00.000Z",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
      scopes: ["openid", "profile", "email"],
      state: "state-1",
      usedAt: "2026-06-04T15:00:00.000Z",
    },
  } as unknown,
  calls: [] as unknown[],
}));

const portalUsers = vi.hoisted(() => ({
  calls: [] as string[],
  result: {
    email: "teanore@gmail.com",
    experience: 0,
    id: "platform-user-1",
    role: { id: 1, name: "owner" },
    username: "teanore",
  },
}));

vi.mock("@/lib/server/oauth-authorization-code-repository", () => ({
  getOAuthAuthorizationCodeRepository: () => ({
    redeem: async (input: unknown) => {
      redeemState.calls.push(input);
      return redeemState.result;
    },
  }),
}));

vi.mock("@/lib/server/nof-portal-auth", () => ({
  getNofPortalAuthRepository: () => ({
    userById: async (userId: string) => {
      portalUsers.calls.push(userId);
      return portalUsers.result;
    },
  }),
}));

vi.stubEnv("NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT", env.values.NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT);
vi.stubEnv("NOF_PLATFORM_OAUTH_JWT_SECRET", env.values.NOF_PLATFORM_OAUTH_JWT_SECRET);

import { POST as token } from "@/app/oauth/token/route";

function tokenRequest(body: URLSearchParams): NextRequest {
  return new NextRequest("http://localhost/oauth/token", {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
}

describe("oauth token route", () => {
  beforeEach(() => {
    redeemState.calls = [];
    portalUsers.calls = [];
    portalUsers.result = {
      email: "teanore@gmail.com",
      experience: 0,
      id: "platform-user-1",
      role: { id: 1, name: "owner" },
      username: "teanore",
    };
    redeemState.result = {
      ok: true,
      record: {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "nonce-1",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
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
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      expires_in: 300,
      scope: "openid profile email",
      token_type: "Bearer",
    });
    expect(body.access_token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(body.id_token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(body.claims).toBeUndefined();
    expect(decodeJwtPayload(String(body.id_token))).toMatchObject({
      email: "teanore@gmail.com",
      email_verified: true,
      preferred_username: "teanore",
      role: "owner",
    });
    expect(portalUsers.calls).toEqual(["platform-user-1"]);
    expect(redeemState.calls).toEqual([
      {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
      },
    ]);
  });

  it("rejects unsupported grant types before redeeming a code", async () => {
    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "password",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
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
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
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
          client_secret: "nof-tt-secret",
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

  it("rejects missing or invalid client authentication before redeeming", async () => {
    const missing = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );
    const invalid = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          client_secret: "wrong-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ error: "invalid_client", ok: false });
    await expect(invalid.json()).resolves.toEqual({ error: "invalid_client", ok: false });
    expect(redeemState.calls).toEqual([]);
  });

  it("does not emit email claims when the email scope was not granted", async () => {
    redeemState.result = {
      ok: true,
      record: {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "nonce-1",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
        scopes: ["openid", "profile"],
        state: "state-1",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };

    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const payload = decodeJwtPayload(String(body.id_token));

    expect(payload.scope).toBe("openid profile");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("email_verified");
    expect(payload).toHaveProperty("role", "owner");
  });

  it("loads the platform user and emits email claims when only the email scope was granted", async () => {
    redeemState.result = {
      ok: true,
      record: {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "nonce-1",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
        scopes: ["openid", "email"],
        state: "state-1",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };

    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const payload = decodeJwtPayload(String(body.id_token));

    expect(payload).toMatchObject({
      email: "teanore@gmail.com",
      email_verified: true,
      scope: "openid email",
    });
    expect(payload).not.toHaveProperty("preferred_username");
    expect(payload).not.toHaveProperty("role");
    expect(portalUsers.calls).toEqual(["platform-user-1"]);
  });

  it("does not emit role claims when the profile scope was not granted", async () => {
    redeemState.result = {
      ok: true,
      record: {
        clientId: "nof-tt",
        code: "oauth_code_valid",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "nonce-1",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
        scopes: ["openid"],
        state: "state-1",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };

    const response = await token(
      tokenRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          client_secret: "nof-tt-secret",
          code: "oauth_code_valid",
          grant_type: "authorization_code",
          redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
        }),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const payload = decodeJwtPayload(String(body.id_token));

    expect(payload.scope).toBe("openid");
    expect(payload).not.toHaveProperty("role");
    expect(portalUsers.calls).toEqual([]);
  });
});
