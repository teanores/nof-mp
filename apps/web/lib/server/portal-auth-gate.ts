import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  decodeExpiredNofAuthToken,
  getNofPortalAuthRepository,
} from "@/lib/server/nof-portal-auth";
import { appendExpiredPortalAuthCookies } from "@/lib/server/logout";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";
import type { ForgePortalSession } from "@/lib/types";

const portalOrigin = "http://portal.local";
const portalLoginPath = "/login";
const sessionExpiredAuditCookieName = "nof_session_expired_audit";

function appendSessionExpiredAuditCookie(response: NextResponse): void {
  response.headers.append(
    "Set-Cookie",
    [
      `${sessionExpiredAuditCookieName}=1`,
      "Path=/",
      "Max-Age=300",
      "HttpOnly",
      "SameSite=lax",
    ].join("; "),
  );
}

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
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return { authenticated: false, loginUrl: portalLoginUrl(`${request.nextUrl.pathname}${request.nextUrl.search}`) };
  }

  return getNofPortalAuthRepository().sessionFromCookie(cookieValue);
}

export async function requirePortalApiSession(request: NextRequest): Promise<NextResponse | undefined> {
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expiredPayload = cookieValue ? decodeExpiredNofAuthToken(cookieValue) : undefined;
  if (expiredPayload?.sub) {
    if (!request.cookies.has(sessionExpiredAuditCookieName)) {
      await recordSecurityAuditEvent({
        actorUserId: expiredPayload.sub,
        actorUsername: expiredPayload.username,
        eventType: "session_expired",
        method: request.method,
        path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
        statusCode: 401,
      });
    }

    const response = NextResponse.json(
      {
        authenticated: false,
        error: "Authentication required",
        loginUrl: portalLoginUrl(`${request.nextUrl.pathname}${request.nextUrl.search}`),
      },
      { status: 401 },
    );
    appendExpiredPortalAuthCookies(response);
    appendSessionExpiredAuditCookie(response);
    return response;
  }

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
  const session = await portalPageSession();
  if (!session.authenticated) {
    redirect(portalLoginUrl(returnTo));
  }

  return session;
}

export async function portalPageSession(): Promise<ForgePortalSession> {
  const cookieStore = await cookies();
  return getNofPortalAuthRepository().sessionFromCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}
