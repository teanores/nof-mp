import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { getPlatformPasswordRepository } from "@/lib/server/platform-password-repository";
import { clientIpFromRequest } from "@/lib/server/registration-abuse-protection";
import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const auditContext = {
    actorUserId: userId,
    actorUsername: session.user?.username,
    ip: clientIpFromRequest(request),
    method: "POST",
    path: "/api/profile/password",
    userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
  };

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "password_change_failed",
      statusCode: 400,
    });
    return NextResponse.json({ error: "password_fields_required" }, { status: 400 });
  }

  const result = await getPlatformPasswordRepository().changePassword({ currentPassword, newPassword, userId });
  if (result.ok) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "password_change_success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true });
  }

  await recordSecurityAuditEvent({
    ...auditContext,
    eventType: "password_change_failed",
    statusCode: 400,
  });

  return NextResponse.json(
    {
      error: result.reason,
      ...(result.errors ? { errors: result.errors } : {}),
    },
    { status: 400 },
  );
}
