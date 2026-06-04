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
    issuedCodes.calls = [];
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
    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          decision: "approve",
          nonce: "n",
          redirect_uri: "https://evil.example/callback",
          response_type: "code",
          scope: "openid",
          state: "s",
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_redirect_uri", ok: false });
    expect(issuedCodes.calls).toEqual([]);
  });

  it("redirects guests to login without issuing a code", async () => {
    portalSession.value = { authenticated: false, loginUrl: "/login?next=%2Foauth%2Fconsent" };

    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          decision: "approve",
          nonce: "n",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
          response_type: "code",
          scope: "openid",
          state: "s",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?next=%2Foauth%2Fconsent");
    expect(issuedCodes.calls).toEqual([]);
  });

  it("issues a code and redirects back to the exact product callback after approval", async () => {
    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          decision: "approve",
          nonce: "n",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
          response_type: "code",
          scope: "openid unknown email",
          state: "s",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://forge-tasks.forgath.ru/auth/platform/callback?code=oauth_code_test&state=s",
    );
    expect(issuedCodes.calls).toEqual([
      {
        clientId: "nof-tt",
        nonce: "n",
        platformUserId: "platform-user-1",
        redirectUri: "https://forge-tasks.forgath.ru/auth/platform/callback",
        scopes: ["openid", "email"],
        state: "s",
        ttlSeconds: 120,
      },
    ]);
  });

  it("returns access denied to the product callback when consent is declined", async () => {
    const response = await approveConsent(
      approveRequest(
        new URLSearchParams({
          client_id: "nof-tt",
          decision: "deny",
          nonce: "n",
          redirect_uri: "https://forge-tasks.forgath.ru/auth/platform/callback",
          response_type: "code",
          scope: "openid",
          state: "s",
        }),
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://forge-tasks.forgath.ru/auth/platform/callback?error=access_denied&state=s",
    );
    expect(issuedCodes.calls).toEqual([]);
  });
});
