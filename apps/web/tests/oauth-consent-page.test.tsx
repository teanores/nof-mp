import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  issueChallenge: vi.fn(),
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalLoginUrl: (returnTo: string) => `/login?next=${encodeURIComponent(returnTo)}`,
  portalPageSession: mocks.portalPageSession,
}));

vi.mock("@/lib/server/oauth-consent-challenge-repository", () => ({
  getOAuthConsentChallengeRepository: () => ({
    issue: mocks.issueChallenge,
  }),
}));

import OAuthConsentPage from "@/app/oauth/consent/page";

const validParams = {
  client_id: "nof-tt",
  nonce: "nonce-1",
  redirect_uri: "https://task-tracker.forgath.ru/auth/platform/callback",
  response_type: "code",
  scope: "openid email",
  state: "state-1",
};

describe("oauth consent page", () => {
  beforeEach(() => {
    mocks.issueChallenge.mockResolvedValue({
      challengeId: "oauth_consent_test",
      clientId: "nof-tt",
      expiresAt: "2026-06-04T15:02:00.000Z",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: validParams.redirect_uri,
      scopes: ["openid", "email"],
      state: "state-1",
    });
  });

  it("redirects guests to login", async () => {
    mocks.portalPageSession.mockResolvedValue({ authenticated: false, loginUrl: "/login" });

    await expect(OAuthConsentPage({ searchParams: Promise.resolve(validParams) })).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Foauth%2Fconsent",
    );
  });

  it("rejects invalid product redirect requests", async () => {
    mocks.portalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "platform-user-1", username: "teanore" },
    });

    await expect(
      OAuthConsentPage({
        searchParams: Promise.resolve({
          ...validParams,
          redirect_uri: "https://evil.example/callback",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/overview");
  });

  it("shows explicit consent controls for the current platform user", async () => {
    mocks.portalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { email: "owner@forgath.ru", experience: 0, id: "platform-user-1", username: "teanore" },
    });

    render(await OAuthConsentPage({ searchParams: Promise.resolve(validParams) }));

    expect(screen.getByRole("heading", { name: "Подключение Task Tracker" })).toBeInTheDocument();
    expect(screen.getByText(/teanore/)).toBeInTheDocument();
    expect(screen.getByText(/owner@forgath.ru/)).toBeInTheDocument();
    expect(screen.getByText("openid")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();

    const approveForm = screen.getByTestId("oauth-approve-form");
    expect(approveForm).toHaveAttribute("action", "/oauth/consent/approve");
    expect(approveForm).toHaveAttribute("method", "post");
    expect(within(approveForm).getByDisplayValue("approve")).toHaveAttribute("name", "decision");
    expect(within(approveForm).getByDisplayValue("oauth_consent_test")).toHaveAttribute("name", "challenge_id");
    expect(within(approveForm).queryByDisplayValue("nof-tt")).not.toBeInTheDocument();
    expect(within(approveForm).queryByDisplayValue(validParams.redirect_uri)).not.toBeInTheDocument();

    const denyForm = screen.getByTestId("oauth-deny-form");
    expect(denyForm).toHaveAttribute("action", "/oauth/consent/approve");
    expect(denyForm).toHaveAttribute("method", "post");
    expect(within(denyForm).getByDisplayValue("deny")).toHaveAttribute("name", "decision");
    expect(within(denyForm).getByDisplayValue("oauth_consent_test")).toHaveAttribute("name", "challenge_id");
    expect(mocks.issueChallenge).toHaveBeenCalledWith({
      clientId: "nof-tt",
      nonce: "nonce-1",
      platformUserId: "platform-user-1",
      redirectUri: validParams.redirect_uri,
      scopes: ["openid", "email"],
      state: "state-1",
      ttlSeconds: 120,
    });
  });
});
