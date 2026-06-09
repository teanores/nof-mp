import { describe, expect, it } from "vitest";

import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
  normalizeOAuthScopes,
  oauthClientRegistry,
} from "@/lib/server/oauth-client-registry";

describe("oauth client registry", () => {
  it("contains product client metadata for nof-tt and nof-ht without secrets", () => {
    expect(oauthClientRegistry.map((client) => client.productKey).sort()).toEqual(["nof-ht", "nof-tt"]);

    for (const client of oauthClientRegistry) {
      expect(client.clientId).toMatch(/^nof-[a-z]+$/);
      expect(client.displayName.length).toBeGreaterThan(0);
      expect(client.redirectUris.length).toBeGreaterThan(0);
      expect(client.scopes).toContain("openid");
      expect(client.cancelReturnPath).toMatch(/^\/services\/[a-z-]+\?oauth=cancelled$/);
      expect(client).not.toHaveProperty("clientSecret");
      expect(client).not.toHaveProperty("secret");
      expect(client).not.toHaveProperty("token");
    }
  });

  it("finds clients by exact client id only", () => {
    expect(findOAuthClient("nof-tt")?.productKey).toBe("nof-tt");
    expect(findOAuthClient(" NOF-TT ")).toBeUndefined();
    expect(findOAuthClient("nof-tt.evil")).toBeUndefined();
    expect(findOAuthClient("")).toBeUndefined();
  });

  it("allows only exact registered redirect URIs", () => {
    expect(isAllowedOAuthRedirectUri("nof-tt", "https://task-tracker.forgath.ru/auth/platform/callback")).toBe(true);
    expect(isAllowedOAuthRedirectUri("nof-tt", "https://forge-tasks.forgath.ru/auth/platform/callback")).toBe(false);
    expect(isAllowedOAuthRedirectUri("nof-tt", "https://task-tracker.forgath.ru/auth/platform/callback/")).toBe(false);
    expect(isAllowedOAuthRedirectUri("nof-tt", "https://evil.example/auth/platform/callback")).toBe(false);
    expect(isAllowedOAuthRedirectUri("nof-tt", "https://task-tracker.forgath.ru/auth/platform/callback?next=/")).toBe(false);
    expect(isAllowedOAuthRedirectUri("nof-ht", "https://habit-tracker.forgath.ru/api/auth/platform/callback")).toBe(true);
    expect(isAllowedOAuthRedirectUri("nof-ht", "https://habit-tracker.forgath.ru/auth/platform/callback")).toBe(false);
    expect(isAllowedOAuthRedirectUri("unknown", "https://task-tracker.forgath.ru/auth/platform/callback")).toBe(false);
  });

  it("normalizes requested scopes to the client allowlist", () => {
    expect(normalizeOAuthScopes("nof-ht", "openid profile email")).toEqual(["openid", "profile", "email"]);
    expect(normalizeOAuthScopes("nof-ht", "openid unknown email email")).toEqual(["openid", "email"]);
    expect(normalizeOAuthScopes("nof-ht", "")).toEqual(["openid"]);
    expect(normalizeOAuthScopes("unknown", "openid")).toEqual([]);
  });
});
