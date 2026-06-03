import React from "react";
import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalPageSession: mocks.portalPageSession,
  safePortalReturnTo: (returnTo?: string) => {
    if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.startsWith("/login")) {
      return "/";
    }

    return returnTo;
  },
}));

import LoginRoute from "@/app/login/page";

describe("login route", () => {
  it("redirects authenticated users to the safe requested page", async () => {
    mocks.portalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { email: "owner@forgath.ru", experience: 0, id: "1", username: "owner" },
    });

    await expect(LoginRoute({ searchParams: Promise.resolve({ next: "/overview" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/overview",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/overview");
  });

  it("renders login form for guests", async () => {
    mocks.portalPageSession.mockResolvedValue({ authenticated: false, loginUrl: "/login" });

    const result = await LoginRoute({ searchParams: Promise.resolve({ next: "/overview" }) });

    expect(result.type.name).toBe("LoginPage");
    expect(result.props.next).toBe("/overview");
  });
});
