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
  if (session.user?.id === userId) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  const deletedUser = await getAdminUsersRepository().deleteUser({
    actorUserId: session.user?.id ?? "00000000-0000-0000-0000-000000000000",
    userId,
  });
  if (!deletedUser) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_deleted",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(deletedUser.id)}/delete`,
    statusCode: 200,
  });

  return NextResponse.json({ deletedUserId: deletedUser.id, ok: true });
}
