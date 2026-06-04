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

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalLoginUrl: (returnTo: string) => `/login?next=${encodeURIComponent(returnTo)}`,
  portalSessionFromRequest: vi.fn(async () => portalSession.value),
  safePortalReturnTo: (returnTo?: string) => {
    if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
      return "/";
    }
    return returnTo;
  },
}));

import { GET as authorize } from "@/app/oauth/authorize/route";

function authorizeRequest(search: string): NextRequest {
  return new NextRequest(`http://localhost/oauth/authorize${search}`, { method: "GET" });
}

describe("oauth authorize route", () => {
  beforeEach(() => {
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

  it("rejects invalid OAuth requests before issuing a code", async () => {
    const response = await authorize(
      authorizeRequest(
        "?client_id=nof-tt&redirect_uri=https%3A%2F%2Fevil.example%2Fcallback&response_type=code&scope=openid&state=s&nonce=n",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_redirect_uri", ok: false });
  });

  it("redirects guests to platform login with the original authorize request as next", async () => {
    portalSession.value = { authenticated: false, loginUrl: "/login?next=%2Foauth%2Fauthorize" };

    const response = await authorize(
      authorizeRequest(
        "?client_id=nof-tt&redirect_uri=https%3A%2F%2Fforge-tasks.forgath.ru%2Fauth%2Fplatform%2Fcallback&response_type=code&scope=openid&state=s&nonce=n",
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?next=%2Foauth%2Fauthorize");
  });

  it("redirects authenticated users to explicit consent without issuing a code from query parameters", async () => {
    const response = await authorize(
      authorizeRequest(
        "?client_id=nof-tt&redirect_uri=https%3A%2F%2Fforge-tasks.forgath.ru%2Fauth%2Fplatform%2Fcallback&response_type=code&scope=openid%20email&state=s&nonce=n&consent=accepted",
      ),
    );

    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toContain("/oauth/consent?");
    expect(location).toContain("client_id=nof-tt");
    expect(location).toContain("state=s");
    expect(location).not.toContain("consent=accepted");
  });
});
