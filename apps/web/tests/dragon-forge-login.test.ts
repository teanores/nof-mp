import { describe, expect, it } from "vitest";

import {
  authCookieValueFromResponse,
  buildPortalLoginFailedRedirect,
  buildPortalLoginRedirect,
  copyAuthCookies,
  dragonForgeInternalLoginUrl,
} from "@/lib/server/dragon-forge-login";

describe("dragon forge login bridge", () => {
  it("targets the internal Dragon Forge login endpoint", () => {
    expect(dragonForgeInternalLoginUrl("http://dragon-forge-internal:5000")).toBe("http://dragon-forge-internal:5000/login");
  });

  it("keeps successful redirects relative to the current portal", () => {
    const response = buildPortalLoginRedirect("/profile");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/profile");
  });

  it("sanitizes failed login return targets", () => {
    const response = buildPortalLoginFailedRedirect("//evil.example/profile");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?next=%2F&error=invalid_credentials");
  });

  it("copies only the Dragon Forge auth cookie from upstream", () => {
    const upstream = new Response(null, {
      headers: {
        "set-cookie": "auth_token=abc; Path=/; HttpOnly; SameSite=strict",
      },
    });
    const target = buildPortalLoginRedirect("/profile");

    copyAuthCookies(upstream, target);

    expect(target.headers.get("set-cookie")).toContain("auth_token=abc");
  });

  it("extracts auth cookie value for post-login profile preferences", () => {
    const upstream = new Response(null, {
      headers: {
        "set-cookie": "auth_token=abc.def.sig; Path=/; HttpOnly; SameSite=strict",
      },
    });

    expect(authCookieValueFromResponse(upstream)).toBe("abc.def.sig");
  });
});
