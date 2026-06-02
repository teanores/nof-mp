import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: false,
    loginUrl: "/login",
  } as ForgePortalSession,
}));

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
        description: "Task tracker",
        key: "nof-tt",
        name: "Forge Tasks",
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

  it("redeems a valid one-time exchange code", async () => {
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
        productKey: "nof-tt",
        state: "state-1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      platformUserId: "user-1",
      productKey: "nof-tt",
      returnTo: "/projects",
    });
  });

  it("rejects invalid exchange codes", async () => {
    const response = await redeemExchange(
      jsonRequest("/api/auth/product-exchange/redeem", {
        code: "px_missing",
        productKey: "nof-tt",
        state: "state-1",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
      ok: false,
    });
  });
});
