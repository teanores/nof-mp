import { NextRequest, NextResponse } from "next/server";

import { dragonForgeAuthCookieName, getDragonForgeAuthRepository } from "@/lib/server/dragon-forge-auth";
import { getUserPreferencesRepository } from "@/lib/server/user-preferences-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(dragonForgeAuthCookieName)?.value;
    const session = await getDragonForgeAuthRepository().sessionFromCookie(token);
    if (!session.user) {
      return NextResponse.json(session);
    }
    const preferences = await getUserPreferencesRepository().get(session.user.id);
    return NextResponse.json({ ...session, preferences });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : "Portal user session was not loaded",
      },
      { status: 500 },
    );
  }
}
