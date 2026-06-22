import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

type AccessAction = "deny" | "restore";

function parseAction(value: unknown): AccessAction | undefined {
  return value === "deny" || value === "restore" ? value : undefined;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; reason?: unknown };
  const action = parseAction(body.action);
  if (!action) {
    return NextResponse.json({ error: "invalid_access_action" }, { status: 400 });
  }

  if (session.user?.id === userId && action === "deny") {
    return NextResponse.json({ error: "cannot_deny_self" }, { status: 400 });
  }

  const user = await getAdminUsersRepository().setAccessState({
    actorUserId: session.user?.id ?? "00000000-0000-0000-0000-000000000000",
    denied: action === "deny",
    reason: typeof body.reason === "string" ? body.reason : undefined,
    userId,
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_access_updated",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(user.id)}/access`,
    statusCode: 200,
  });

  return NextResponse.json({ accessState: user.accessState, ok: true });
}
