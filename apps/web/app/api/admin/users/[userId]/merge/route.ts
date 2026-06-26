import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository, type AdminUserListItem } from "@/lib/server/admin-users-repository";
import { getCanonicalIdentityRepository } from "@/lib/server/canonical-identity-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

function aliasesForUser(user: AdminUserListItem) {
  return [
    ...(user.email
      ? [
          {
            aliasKind: "email" as const,
            aliasValue: user.email,
            verificationState: "unverified" as const,
          },
        ]
      : []),
    ...(user.telegram?.id
      ? [
          {
            aliasKind: "telegram_id" as const,
            aliasProvider: "telegram",
            aliasValue: user.telegram.id,
            verificationState: "unverified" as const,
          },
        ]
      : []),
    ...(user.telegram?.username
      ? [
          {
            aliasKind: "telegram_username" as const,
            aliasProvider: "telegram",
            aliasValue: user.telegram.username,
            verificationState: "unverified" as const,
          },
        ]
      : []),
  ];
}

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

  const users = getAdminUsersRepository();
  const [sourceUser, targetUser] = await Promise.all([users.getUserById(userId), users.getUserById(targetUserId)]);
  if (!sourceUser || !targetUser) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const actorUserId = session.user?.id ?? "00000000-0000-0000-0000-000000000000";
  const canonicalIdentity = getCanonicalIdentityRepository();
  const targetLink = await canonicalIdentity.claimAliasesForPlatformUser({
    actorUserId,
    aliases: aliasesForUser(targetUser),
    platformUserId: targetUser.id,
  });
  if (!targetLink.ok) {
    return NextResponse.json({ error: targetLink.reason }, { status: targetLink.reason === "alias_conflict" ? 409 : 400 });
  }

  const sourceLink = await canonicalIdentity.claimAliasesForPlatformUser({
    actorUserId,
    aliases: aliasesForUser(sourceUser),
    personId: targetLink.personId,
    platformUserId: sourceUser.id,
  });
  if (!sourceLink.ok) {
    return NextResponse.json({ error: sourceLink.reason }, { status: sourceLink.reason === "alias_conflict" ? 409 : 400 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_identity_link_updated",
    method: "POST",
    path: `/api/admin/users/${encodeURIComponent(sourceUser.id)}/merge`,
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, personId: targetLink.personId, sourceUserId: sourceUser.id, targetUserId: targetUser.id });
}
