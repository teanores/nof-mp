import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { getPasswordResetDelivery } from "@/lib/server/password-reset-delivery";
import { recordPasswordResetDeliveryOutcome } from "@/lib/server/password-reset-delivery-outcome";
import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";
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
  const user = await getAdminUsersRepository().getUserById(userId);
  if (!user || user.recoveryState !== "email-reset-ready" || !user.email) {
    return NextResponse.json({ error: "email_recovery_unavailable" }, { status: 400 });
  }

  const result = await getPlatformPasswordResetRepository().requestReset({ email: user.email });
  if (result.reason !== "token_created") {
    recordPasswordResetDeliveryOutcome({ outcome: "not_requested", userId: user.id });
    return NextResponse.json({ ok: true });
  }

  try {
    const delivery = await getPasswordResetDelivery().sendResetLink({
      email: user.email,
      expiresAt: result.expiresAt,
      resetToken: result.resetToken,
      userId: result.userId,
    });
    recordPasswordResetDeliveryOutcome({ outcome: delivery.mode === "not_configured" ? "not_configured" : "delivered", userId: result.userId });
    await recordSecurityAuditEvent({
      actorUserId: session.user?.id,
      actorUsername: session.user?.username,
      eventType: "admin_password_reset_requested",
      method: "POST",
      path: `/api/admin/users/${encodeURIComponent(user.id)}/password-reset`,
      statusCode: 200,
    });
  } catch {
    recordPasswordResetDeliveryOutcome({ outcome: "failed", userId: result.userId });
    await recordSecurityAuditEvent({
      actorUserId: session.user?.id,
      actorUsername: session.user?.username,
      eventType: "admin_password_reset_requested",
      method: "POST",
      path: `/api/admin/users/${encodeURIComponent(user.id)}/password-reset`,
      statusCode: 502,
    });
  }

  return NextResponse.json({ ok: true });
}
