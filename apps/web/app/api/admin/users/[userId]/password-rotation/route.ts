import { type NextRequest, NextResponse } from "next/server";

import { getPasswordPolicyStateRepository } from "@/lib/server/password-policy-state-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

const allowedReasons = new Set(["admin_required_rotation", "legacy_weak_password"]);

function safeReason(value: unknown): string {
  return typeof value === "string" && allowedReasons.has(value) ? value : "admin_required_rotation";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const reason = safeReason(body.reason);

  await getPasswordPolicyStateRepository().requireRotation({ reason, userId });

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_password_rotation_required",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(userId)}/password-rotation`,
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, userId });
}
