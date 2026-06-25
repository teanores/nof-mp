import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { targetUserId?: unknown };
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  if (!targetUserId) {
    return NextResponse.json({ error: "target_user_required" }, { status: 400 });
  }
  if (targetUserId === userId) {
    return NextResponse.json({ error: "cannot_merge_self" }, { status: 400 });
  }

  const result = await getAdminUsersRepository().mergeUserIntoCanonical({
    actorUserId: session.user?.id ?? "00000000-0000-0000-0000-000000000000",
    sourceUserId: userId,
    targetUserId,
  });
  if (!result) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_merged",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(result.sourceUserId)}/merge`,
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, sourceUserId: result.sourceUserId, targetUserId: result.targetUserId });
}
