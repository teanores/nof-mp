import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { isTelegramPlaceholderEmail } from "@/lib/server/email-address-policy";
import { getMessengerGateway } from "@/lib/server/messenger-gateway";
import { getPlatformEmailLinkRepository } from "@/lib/server/platform-email-link-repository";
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
  if (!user?.email || !user.telegram?.id || !isTelegramPlaceholderEmail(user.email)) {
    return NextResponse.json({ error: "email_link_unavailable" }, { status: 400 });
  }

  const issueResult = await getPlatformEmailLinkRepository().issueLink({ actorUserId: session.user?.id, userId: user.id });
  if (!issueResult.ok) {
    return NextResponse.json({ error: "email_link_unavailable" }, { status: 400 });
  }

  const delivery = await getMessengerGateway().sendEmailLink({
    expiresAt: issueResult.expiresAt,
    token: issueResult.token,
    userId: issueResult.userId,
  });

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_email_link_requested",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(user.id)}/email-link`,
    statusCode: delivery.ok ? 202 : 202,
  });

  return NextResponse.json(
    {
      delivery: delivery.ok ? { status: delivery.status } : { reason: delivery.reason, status: delivery.status },
      ok: true,
    },
    { status: 202 },
  );
}
