import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const portalSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "platform-user-1",
      username: "teanore",
    },
  } as ForgePortalSession,
}));

const issuedCodes = vi.hoisted(() => ({
  calls: [] as unknown[],
}));

const consumedChallenges = vi.hoisted(() => ({
  calls: [] as unknown[],
  result: {
    ok: true,
    record: {
      challengeId: "oauth_consent_test",
      clientId: "nof-tt",
      expiresAt: "2026-06-04T15:02:00.000Z",
      nonce: "n",
      platformUserId: "platform-user-1",
      redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
      scopes: ["openid", "email"],
      state: "s",
      usedAt: "2026-06-04T15:00:00.000Z",
    },
  } as unknown,
}));

const consentTokens = vi.hoisted(() => ({
  result: undefined as unknown,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalLoginUrl: (returnTo: string) => `/login?next=${encodeURIComponent(returnTo)}`,
  portalSessionFromRequest: vi.fn(async () => portalSession.value),
}));

vi.mock("@/lib/server/oauth-authorization-code-repository", () => ({
  getOAuthAuthorizationCodeRepository: () => ({
    issue: async (input: unknown) => {
      issuedCodes.calls.push(input);
      return {
        ...(input as object),
        code: "oauth_code_test",
        expiresAt: "2026-06-04T15:02:00.000Z",
      };
    },
  }),
}));

vi.mock("@/lib/server/oauth-consent-challenge-repository", () => ({
  getOAuthConsentChallengeRepository: () => ({
    consume: async (input: unknown) => {
      consumedChallenges.calls.push(input);
      return consumedChallenges.result;
    },
  }),
}));

vi.mock("@/lib/server/oauth-consent-token", () => ({
  verifyOAuthConsentToken: vi.fn(() => consentTokens.result),
}));

import { POST as approveConsent } from "@/app/oauth/consent/approve/route";

function approveRequest(body: URLSearchParams): NextRequest {
  return new NextRequest("http://localhost/oauth/consent/approve", {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

describe("oauth consent approve route", () => {
  beforeEach(() => {
    consumedChallenges.calls = [];
    consumedChallenges.result = {
      ok: true,
      record: {
        challengeId: "oauth_consent_test",
        clientId: "nof-tt",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "n",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
        scopes: ["openid", "email"],
        state: "s",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };
    issuedCodes.calls = [];
    consentTokens.result = undefined;
    portalSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "platform-user-1",
        username: "teanore",
      },
    };
  });

  it("rejects invalid redirect URIs without issuing a code", async () => {
    consumedChallenges.result = {
      error: "not_found",
      ok: false,
    };

    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "missing",
          decision: "approve",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_consent_challenge", ok: false });
    expect(consumedChallenges.calls).toEqual([{ challengeId: "missing", platformUserId: "platform-user-1" }]);
    expect(issuedCodes.calls).toEqual([]);
  });

  it("redirects guests to login without issuing a code", async () => {
    portalSession.value = { authenticated: false, loginUrl: "/login?next=%2Foauth%2Fconsent" };

    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "oauth_consent_test",
          decision: "approve",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?next=%2Foauth%2Fconsent");
    expect(consumedChallenges.calls).toEqual([]);
    expect(issuedCodes.calls).toEqual([]);
  });

  it("issues a code and redirects back to the exact product callback after approval", async () => {
    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "oauth_consent_test",
          decision: "approve",
          scope: "openid unknown evil",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://task-tracker.forgath.ru/auth/platform/callback?code=oauth_code_test&state=s",
    );
    expect(consumedChallenges.calls).toEqual([{ challengeId: "oauth_consent_test", platformUserId: "platform-user-1" }]);
    expect(issuedCodes.calls).toEqual([
      {
        clientId: "nof-tt",
        nonce: "n",
        platformUserId: "platform-user-1",
        redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
        scopes: ["openid", "email"],
        state: "s",
        ttlSeconds: 120,
      },
    ]);
  });

  it("uses a signed consent token when the database challenge is unavailable", async () => {
    consumedChallenges.result = {
      error: "not_found",
      ok: false,
    };
    consentTokens.result = {
      challengeId: "oauth_consent_test",
      clientId: "nof-tt",
      expiresAt: "2026-06-04T15:02:00.000Z",
      nonce: "n",
      platformUserId: "platform-user-1",
      redirectUri: "https://task-tracker.forgath.ru/auth/platform/callback",
      scopes: ["openid", "email"],
      state: "s",
    };

    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "oauth_consent_test",
          consent_token: "signed_consent_token_test",
          decision: "approve",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://task-tracker.forgath.ru/auth/platform/callback?code=oauth_code_test&state=s",
    );
    expect(issuedCodes.calls).toHaveLength(1);
  });

  it("returns nof-tt users to the platform service page when consent is declined", async () => {
    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "oauth_consent_test",
          decision: "deny",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/services/task-tracker?oauth=cancelled");
    expect(consumedChallenges.calls).toEqual([{ challengeId: "oauth_consent_test", platformUserId: "platform-user-1" }]);
    expect(issuedCodes.calls).toEqual([]);
  });

  it("returns nof-ht users to the platform service page when consent is declined", async () => {
    consumedChallenges.result = {
      ok: true,
      record: {
        challengeId: "oauth_consent_test",
        clientId: "nof-ht",
        expiresAt: "2026-06-04T15:02:00.000Z",
        nonce: "n",
        platformUserId: "platform-user-1",
        redirectUri: "https://habit-tracker.forgath.ru/api/auth/platform/callback",
        scopes: ["openid", "email"],
        state: "s",
        usedAt: "2026-06-04T15:00:00.000Z",
      },
    };

    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          challenge_id: "oauth_consent_test",
          decision: "deny",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/services/habit-tracker?oauth=cancelled");
    expect(consumedChallenges.calls).toEqual([{ challengeId: "oauth_consent_test", platformUserId: "platform-user-1" }]);
    expect(issuedCodes.calls).toEqual([]);
  });
});
