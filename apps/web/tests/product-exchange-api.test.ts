import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: false,
    loginUrl: "/login",
  } as ForgePortalSession,
}));

vi.stubEnv(
  "NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT",
  "bd44784944c8c62f639d7340f7020b75666e9554e788638a5df0b29b3b024c8e",
);
vi.stubEnv(
  "NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_CB",
  "ce84a520b7e83a8cbe4c9bb8821b7d27cd8c172b3c67d4b137497d11f1d63600",
);

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => {
    if (authSession.value.authenticated) {
      return undefined;
    }

    return Response.json(
      {
        authenticated: false,
        error: "Authentication required",
        loginUrl: authSession.value.loginUrl,
      },
      { status: 401 },
    );
  }),
}));

vi.mock("@/lib/server/product-access-repository", () => ({
  subjectFromPortalSession: () => ({ role: "user", userId: "user-1" }),
  getProductAccessRepository: () => ({
    exists: async (productKey: string) => productKey === "nof-tt" || productKey === "nof-onw",
    listForSubject: async () => [
      {
        access: { allowed: true, reason: "registered-user" },
        createdAt: "2026-05-28T00:00:00.000Z",
        description: "Coffee bot",
        key: "nof-cb",
        name: "Coffee Bot",
        status: "active",
        visibility: "public",
      },
      {
        access: { allowed: true, reason: "registered-user" },
        createdAt: "2026-05-28T00:00:00.000Z",
        description: "Task tracker",
        key: "nof-tt",
        name: "Task Tracker",
        status: "active",
        visibility: "registered",
      },
      {
        access: { allowed: false, reason: "invitation-required" },
        createdAt: "2026-05-28T00:00:00.000Z",
        description: "Private service",
        key: "nof-onw",
        name: "Private Service",
        status: "active",
        visibility: "invited",
      },
    ],
  }),
}));

import { POST as redeemExchange } from "@/app/api/auth/product-exchange/redeem/route";
import { POST as issueExchange } from "@/app/api/auth/product-exchange/issue/route";
import { getProductExchangeRepository } from "@/lib/server/product-exchange-repository";

function jsonRequest(pathname: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("product exchange API", () => {
  beforeEach(() => {
    authSession.value = { authenticated: false, loginUrl: "/login" };
  });

  it("requires platform authentication before issuing an exchange code", async () => {
    const response = await issueExchange(jsonRequest("/api/auth/product-exchange/issue", { productKey: "nof-tt" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      error: "Authentication required",
    });
  });

  it("denies exchange issue when the platform policy does not allow the product", async () => {
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "user-1",
        username: "teanore",
      },
    };

    const response = await issueExchange(jsonRequest("/api/auth/product-exchange/issue", { productKey: "nof-onw" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "access_denied",
      ok: false,
      reason: "invitation-required",
    });
  });

  it("does not issue legacy exchange codes for OAuth-managed products", async () => {
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "user-1",
        username: "teanore",
      },
    };

    const response = await issueExchange(jsonRequest("/api/auth/product-exchange/issue", { productKey: "nof-tt" }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "standard_oauth_required",
      ok: false,
      productKey: "nof-tt",
    });
  });

  it("redeems a valid one-time exchange code", async () => {
    const issued = await getProductExchangeRepository().issue({
      platformUserId: "user-1",
      productKey: "nof-cb",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    const response = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: issued.code,
        clientSecret: "nof-cb-secret",
        productKey: "nof-cb",
        state: "state-1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      platformUserId: "user-1",
      productKey: "nof-cb",
      returnTo: "/projects",
    });
  });

  it("does not redeem legacy exchange codes for OAuth-managed products", async () => {
    const issued = await getProductExchangeRepository().issue({
      platformUserId: "user-1",
      productKey: "nof-tt",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    const response = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: issued.code,
        clientSecret: "nof-tt-secret",
        productKey: "nof-tt",
        state: "state-1",
      }),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "standard_oauth_required",
      ok: false,
      productKey: "nof-tt",
    });
  });

  it("rejects invalid exchange codes", async () => {
    const response = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: "px_missing",
        clientSecret: "nof-cb-secret",
        productKey: "nof-cb",
        state: "state-1",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
      ok: false,
    });
  });

  it("requires product client authentication before redeeming exchange codes", async () => {
    const issued = await getProductExchangeRepository().issue({
      platformUserId: "user-1",
      productKey: "nof-cb",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    const missing = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: issued.code,
        productKey: "nof-cb",
        state: "state-1",
      }),
    );
    const invalid = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: issued.code,
        clientSecret: "wrong-secret",
        productKey: "nof-cb",
        state: "state-1",
      }),
    );

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ error: "invalid_client", ok: false });
    await expect(invalid.json()).resolves.toEqual({ error: "invalid_client", ok: false });
  });
});
