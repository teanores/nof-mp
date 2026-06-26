import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { getPlatformProfileRepository } from "@/lib/server/platform-profile-repository";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { aboutMe?: unknown; username?: unknown };
  const username = typeof body.username === "string" ? body.username : session.user?.username ?? "";
  const aboutMe = typeof body.aboutMe === "string" ? body.aboutMe : undefined;

  const result = await getPlatformProfileRepository().updateOwnProfile({ aboutMe, userId, username });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.reason === "not_found" ? 404 : 400 });
  }

  await recordSecurityAuditEvent({
    actorUserId: userId,
    actorUsername: result.profile.username,
    eventType: "profile_updated",
    method: "PATCH",
    path: "/api/profile",
    statusCode: 200,
  });

  return NextResponse.json({ profile: result.profile });
}
