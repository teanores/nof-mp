import { type NextRequest, NextResponse } from "next/server";

import { authRateLimit } from "@/lib/server/auth-abuse-protection";
import { appendExpiredPortalAuthCookies } from "@/lib/server/logout";
import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";
import { clientIpFromRequest } from "@/lib/server/registration-abuse-protection";
import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { newPassword?: unknown; token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token || !newPassword) {
    await recordSecurityAuditEvent({
      eventType: "password_reset_failed",
      ip: clientIpFromRequest(request),
      method: "POST",
      path: "/api/public/password-reset/confirm",
      statusCode: 400,
      userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
    });
    return NextResponse.json({ error: "password_reset_fields_required" }, { status: 400 });
  }

  const auditContext = {
    ip: clientIpFromRequest(request),
    method: "POST",
    path: "/api/public/password-reset/confirm",
    userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
  };
  const limit = authRateLimit(`password-reset-confirm:${auditContext.ip}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "password_reset_rate_limited",
      statusCode: 429,
    });
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const result = await getPlatformPasswordResetRepository().confirmReset({ newPassword, token });
  if (result.ok) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "password_reset_completed",
      statusCode: 200,
    });
    const response = NextResponse.json({ ok: true });
    appendExpiredPortalAuthCookies(response);
    return response;
  }

  await recordSecurityAuditEvent({
    ...auditContext,
    eventType: "password_reset_failed",
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
