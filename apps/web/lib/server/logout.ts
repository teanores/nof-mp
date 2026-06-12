import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/server/nof-portal-auth";

const logoutCookieDomains = [undefined, "forgath.ru", ".forgath.ru"] as const;

function expiredAuthCookie(domain?: string): string {
  return [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=lax",
    ...(domain ? [`Domain=${domain}`] : []),
  ].join("; ");
}

export function buildPortalLogoutResponse(redirectTo = "/login"): NextResponse {
  const response = new NextResponse(null, {
    headers: { Location: redirectTo },
    status: 303,
  });

  for (const domain of logoutCookieDomains) {
    response.headers.append("Set-Cookie", expiredAuthCookie(domain));
  }

  return response;
}
