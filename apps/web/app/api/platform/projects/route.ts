import { NextRequest, NextResponse } from "next/server";

import { getNofPlatformAuthRepository, nofPlatformAuthCookieName } from "@/lib/server/platform-auth";
import { getProductAccessRepository, subjectFromPortalSession } from "@/lib/server/product-access-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(nofPlatformAuthCookieName)?.value;
  const session = await getNofPlatformAuthRepository().sessionFromCookie(token);
  const subject = subjectFromPortalSession(session);
  const projects = await getProductAccessRepository().listForSubject(subject);

  return NextResponse.json({ projects });
}
