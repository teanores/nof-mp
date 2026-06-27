import { type NextRequest, NextResponse } from "next/server";

import { getCanonicalIdentityRepository } from "@/lib/server/canonical-identity-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const body = (await request.json().catch(() => ({}))) as { personId?: unknown; platformUserId?: unknown };
  const personId = typeof body.personId === "string" ? body.personId.trim() : "";
  const platformUserId = typeof body.platformUserId === "string" ? body.platformUserId.trim() : "";
  if (!personId || !platformUserId) {
    return NextResponse.json({ error: "link_required" }, { status: 400 });
  }

  const result = await getCanonicalIdentityRepository().unlinkPlatformUser({
    actorUserId: session.user?.id,
    personId,
    platformUserId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_identity_reconciliation_unlinked",
    method: "POST",
    path: "/api/admin/identity/reconcile/unlink",
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, personId: result.personId, platformUserId: result.platformUserId });
}
