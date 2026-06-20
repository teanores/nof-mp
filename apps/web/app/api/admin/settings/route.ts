import { type NextRequest, NextResponse } from "next/server";

import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  return NextResponse.json({ settings: await getPlatformSettingsRepository().getSettings() });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const input = (await request.json().catch(() => ({}))) as { registrationPaused?: unknown };
  if (typeof input.registrationPaused !== "boolean") {
    return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  }

  const settings = await getPlatformSettingsRepository().setRegistrationPaused(input.registrationPaused, session.user?.id);
  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_settings_updated",
    method: "PATCH",
    path: "/api/admin/settings",
    statusCode: 200,
  });

  return NextResponse.json({ settings });
}
