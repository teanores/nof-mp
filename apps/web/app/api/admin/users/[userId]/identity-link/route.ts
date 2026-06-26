import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { getCanonicalIdentityRepository } from "@/lib/server/canonical-identity-repository";
import { isResettableEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

function parseTelegramId(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function aliasErrorResponse(reason: "alias_conflict" | "invalid_alias" | "invalid_person"): NextResponse {
  if (reason === "alias_conflict") {
    return NextResponse.json({ error: "alias_conflict" }, { status: 409 });
  }
  if (reason === "invalid_person") {
    return NextResponse.json({ error: "canonical_person_not_found" }, { status: 409 });
  }
  return NextResponse.json({ error: "invalid_identity_alias" }, { status: 400 });
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

  const user = await getAdminUsersRepository().getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const actorUserId = session.user?.id ?? "00000000-0000-0000-0000-000000000000";
  const canonicalIdentity = getCanonicalIdentityRepository();
  const platformAlias = await canonicalIdentity.claimAlias({
    actorUserId,
    aliasKind: "platform_user_id",
    aliasValue: userId,
    platformUserId: userId,
    verificationState: "verified",
  });
  if (!platformAlias.ok) return aliasErrorResponse(platformAlias.reason);

  const emailAlias = await canonicalIdentity.claimAlias({
    actorUserId,
    aliasKind: "email",
    aliasValue: email,
    personId: platformAlias.personId,
    platformUserId: userId,
    verificationState: "unverified",
  });
  if (!emailAlias.ok) return aliasErrorResponse(emailAlias.reason);

  const telegramIdAlias = await canonicalIdentity.claimAlias({
    actorUserId,
    aliasKind: "telegram_id",
    aliasProvider: "telegram",
    aliasValue: telegramId,
    personId: platformAlias.personId,
    platformUserId: userId,
    verificationState: "unverified",
  });
  if (!telegramIdAlias.ok) return aliasErrorResponse(telegramIdAlias.reason);

  const telegramUsername = typeof body.telegramUsername === "string" ? body.telegramUsername.trim().replace(/^@/, "") : "";
  if (telegramUsername) {
    const telegramUsernameAlias = await canonicalIdentity.claimAlias({
      actorUserId,
      aliasKind: "telegram_username",
      aliasProvider: "telegram",
      aliasValue: telegramUsername,
      personId: platformAlias.personId,
      platformUserId: userId,
      verificationState: "unverified",
    });
    if (!telegramUsernameAlias.ok) return aliasErrorResponse(telegramUsernameAlias.reason);
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
