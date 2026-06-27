import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
  getSettings: vi.fn(),
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

vi.mock("@/lib/server/platform-settings-repository", () => ({
  getPlatformSettingsRepository: () => ({
    getSettings: mocks.getSettings,
  }),
}));

import LoginRoute from "@/app/login/page";

describe("login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ registrationPaused: false });
  });

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
    expect(result.props.registrationPaused).toBe(false);
  });

  it("passes registration paused state to the guest login form", async () => {
    mocks.portalPageSession.mockResolvedValue({ authenticated: false, loginUrl: "/login" });
    mocks.getSettings.mockResolvedValue({ registrationPaused: true });

    const result = await LoginRoute({ searchParams: Promise.resolve({ next: "/overview" }) });

    expect(result.props.registrationPaused).toBe(true);
  });
});
