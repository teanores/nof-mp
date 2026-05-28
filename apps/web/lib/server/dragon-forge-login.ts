import { NextResponse } from "next/server";

import { safePortalReturnTo } from "@/lib/server/portal-auth-gate";

const defaultDragonForgeInternalUrl = "http://dragon-forge-internal:5000";

export function dragonForgeInternalLoginUrl(baseUrl = process.env.DRAGON_FORGE_INTERNAL_URL ?? defaultDragonForgeInternalUrl): string {
  return new URL("/login", baseUrl).toString();
}

export function buildPortalLoginRedirect(returnTo: string): NextResponse {
  return new NextResponse(null, {
    headers: { Location: safePortalReturnTo(returnTo) },
    status: 303,
  });
}

export function buildPortalLoginFailedRedirect(returnTo: string): NextResponse {
  const url = new URL("/login", "http://localhost");
  url.searchParams.set("next", safePortalReturnTo(returnTo));
  url.searchParams.set("error", "invalid_credentials");

  return new NextResponse(null, {
    headers: { Location: `${url.pathname}${url.search}` },
    status: 303,
  });
}

export function copyAuthCookies(source: Response, target: NextResponse): void {
  const headers = source.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() ?? [];
  const fallbackCookie = source.headers.get("set-cookie");

  for (const cookie of setCookies.length > 0 ? setCookies : fallbackCookie ? [fallbackCookie] : []) {
    if (cookie.startsWith("auth_token=")) {
      target.headers.append("set-cookie", cookie);
    }
  }
}

export function authCookieValueFromResponse(source: Response): string | undefined {
  const headers = source.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() ?? [];
  const fallbackCookie = source.headers.get("set-cookie");

  for (const cookie of setCookies.length > 0 ? setCookies : fallbackCookie ? [fallbackCookie] : []) {
    if (cookie.startsWith("auth_token=")) {
      return cookie.slice("auth_token=".length).split(";")[0];
    }
  }

  return undefined;
}
