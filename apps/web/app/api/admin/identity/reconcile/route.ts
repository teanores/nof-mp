import { type NextRequest, NextResponse } from "next/server";

import { getAdminUsersRepository, type AdminUserListItem } from "@/lib/server/admin-users-repository";
import { getCanonicalIdentityRepository } from "@/lib/server/canonical-identity-repository";
import { isServiceEmail } from "@/lib/server/email-address-policy";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

function aliasesForUser(user: AdminUserListItem) {
  return [
    ...(user.email && !isServiceEmail(user.email)
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

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const body = (await request.json().catch(() => ({}))) as { additionalUserIds?: unknown; canonicalUserId?: unknown; primaryUserId?: unknown; userIds?: unknown };
  const primaryUserId = typeof body.primaryUserId === "string" ? body.primaryUserId.trim() : "";
  const additionalUserIds = uniqueStrings(body.additionalUserIds);
  if (primaryUserId && additionalUserIds.includes(primaryUserId)) {
    return NextResponse.json({ error: "primary_user_cannot_be_additional" }, { status: 400 });
  }
  const canonicalUserId = primaryUserId || (typeof body.canonicalUserId === "string" ? body.canonicalUserId.trim() : "");
  const userIds = primaryUserId ? [primaryUserId, ...additionalUserIds] : uniqueStrings(body.userIds);
  if (!canonicalUserId || !userIds.includes(canonicalUserId)) {
    return NextResponse.json({ error: "canonical_user_required" }, { status: 400 });
  }
  if (userIds.length < 2) {
    return NextResponse.json({ error: "too_few_users" }, { status: 400 });
  }

  const adminUsers = getAdminUsersRepository();
  const users = await Promise.all(userIds.map((userId) => adminUsers.getUserById(userId)));
  if (users.some((user) => !user)) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const actorUserId = session.user?.id ?? "00000000-0000-0000-0000-000000000000";
  const result = await getCanonicalIdentityRepository().reconcilePlatformUsers({
    actorUserId,
    canonicalPlatformUserId: canonicalUserId,
    users: (users as AdminUserListItem[]).map((user) => ({
      actorUserId,
      aliases: aliasesForUser(user),
      platformUserId: user.id,
    })),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.reason === "alias_conflict" ? 409 : 400 });
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_identity_reconciliation_updated",
    method: "POST",
    path: "/api/admin/identity/reconcile",
    statusCode: 200,
  });

  return NextResponse.json({ ok: true, personId: result.personId, linkedUserIds: result.linkedUserIds });
}
