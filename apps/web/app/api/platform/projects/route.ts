import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getNofPortalAuthRepository } from "@/lib/server/nof-portal-auth";
import { getMcpTokenRepository } from "@/lib/server/mcp-token-repository";
import { subjectFromPortalSession } from "@/lib/server/product-access-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await getNofPortalAuthRepository().sessionFromCookie(token);
  const subject = subjectFromPortalSession(session);
  const projects = await getMcpTokenRepository().listProjectsForTokenIssuer(subject);

  return NextResponse.json({ projects });
}
