import { NextResponse } from "next/server";

import { nofPlatformAuthCookieName } from "@/lib/server/platform-auth";

export function buildPortalLogoutResponse(redirectTo = "/login"): NextResponse {
  const response = new NextResponse(null, {
    headers: { Location: redirectTo },
    status: 303,
  });

  response.cookies.set(nofPlatformAuthCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
