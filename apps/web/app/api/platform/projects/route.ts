import { NextRequest, NextResponse } from "next/server";

import { dragonForgeAuthCookieName, getDragonForgeAuthRepository } from "@/lib/server/dragon-forge-auth";
import { getProductAccessRepository, subjectFromPortalSession } from "@/lib/server/product-access-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(dragonForgeAuthCookieName)?.value;
  const session = await getDragonForgeAuthRepository().sessionFromCookie(token);
  const subject = subjectFromPortalSession(session);
  const projects = await getProductAccessRepository().listForSubject(subject);

  return NextResponse.json({ projects });
}