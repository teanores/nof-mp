import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { isResettableEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

function parseTelegramId(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; telegramId?: unknown; telegramUsername?: unknown };
  const email = typeof body.email === "string" ? normalizePlatformEmail(body.email) : "";
  if (!isResettableEmail(email)) {
    return NextResponse.json({ error: "real_email_required" }, { status: 400 });
  }

  const telegramId = parseTelegramId(body.telegramId);
  if (!telegramId) {
    return NextResponse.json({ error: "telegram_id_required" }, { status: 400 });
  }

  const user = await getAdminUsersRepository().updateUserIdentityLink({
    actorUserId: session.user?.id ?? "00000000-0000-0000-0000-000000000000",
    email,
    telegramId,
    telegramUsername: typeof body.telegramUsername === "string" ? body.telegramUsername.trim().replace(/^@/, "") : undefined,
    userId,
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_identity_link_updated",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(user.id)}/identity-link`,
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
