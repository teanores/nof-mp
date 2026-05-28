import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import {
  dragonForgeAuthCookieName,
  getDragonForgeAuthRepository,
} from "@/lib/server/dragon-forge-auth";
import type { ForgePortalSession } from "@/lib/types";

const portalOrigin = "http://portal.local";
const portalLoginPath = "/login";

export function safePortalReturnTo(returnTo?: string): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  let parsed: URL;
  try {
    parsed = new URL(returnTo, portalOrigin);
  } catch {
    return "/";
  }

  if (parsed.origin !== portalOrigin || parsed.pathname === portalLoginPath) {
    return "/";
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function legacyLoginUrl(loginUrl: string, returnTo: string): string {
  const url = new URL(loginUrl);
  url.searchParams.set("next", safePortalReturnTo(returnTo));
  return url.toString();
}

export function portalLoginUrl(returnTo: string): string {
  const url = new URL(portalLoginPath, portalOrigin);
  url.searchParams.set("next", safePortalReturnTo(returnTo));
  return `${url.pathname}${url.search}`;
}

export async function portalSessionFromRequest(request: NextRequest): Promise<ForgePortalSession> {
  return getDragonForgeAuthRepository().sessionFromCookie(request.cookies.get(dragonForgeAuthCookieName)?.value);
}

export async function requirePortalApiSession(request: NextRequest): Promise<NextResponse | undefined> {
  const session = await portalSessionFromRequest(request);
  if (session.authenticated) {
    return undefined;
  }

  return NextResponse.json(
    {
      authenticated: false,
      error: "Authentication required",
      loginUrl: portalLoginUrl(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    },
    { status: 401 },
  );
}

export async function requirePortalPageSession(returnTo: string): Promise<ForgePortalSession> {
  const cookieStore = await cookies();
  const session = await getDragonForgeAuthRepository().sessionFromCookie(cookieStore.get(dragonForgeAuthCookieName)?.value);
  if (!session.authenticated) {
    redirect(portalLoginUrl(returnTo));
  }

  return session;
}
