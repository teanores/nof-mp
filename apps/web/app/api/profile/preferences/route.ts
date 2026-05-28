import { NextRequest, NextResponse } from "next/server";

import { normalizePortalLanguage } from "@/lib/portal-language";
import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { getUserPreferencesRepository } from "@/lib/server/user-preferences-repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authenticated user was not loaded" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { language?: string };
  const preferences = await getUserPreferencesRepository().upsert(userId, {
    language: normalizePortalLanguage(body.language),
  });
  return NextResponse.json({ preferences });
}
