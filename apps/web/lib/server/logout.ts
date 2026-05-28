import { NextResponse } from "next/server";

import { dragonForgeAuthCookieName } from "@/lib/server/dragon-forge-auth";

export function buildPortalLogoutResponse(redirectTo = "/login"): NextResponse {
  const response = new NextResponse(null, {
    headers: { Location: redirectTo },
    status: 303,
  });

  response.cookies.set(dragonForgeAuthCookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
