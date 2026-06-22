import { type NextRequest, NextResponse } from "next/server";

import { authRateLimit } from "@/lib/server/auth-abuse-protection";
import { getPasswordResetDelivery } from "@/lib/server/password-reset-delivery";
import { recordPasswordResetDeliveryOutcome } from "@/lib/server/password-reset-delivery-outcome";
import { getPlatformPasswordResetRepository, normalizePasswordResetEmail } from "@/lib/server/platform-password-reset-repository";
import { clientIpFromRequest, hashRegistrationEmail } from "@/lib/server/registration-abuse-protection";
import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? normalizePasswordResetEmail(body.email) : "";
  const auditContext = {
    ip: clientIpFromRequest(request),
    method: "POST",
    path: "/api/public/password-reset/request",
    userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
  };

  if (email) {
    const limit = authRateLimit(`password-reset-request:${auditContext.ip}:${hashRegistrationEmail(email)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      await recordSecurityAuditEvent({
        ...auditContext,
        eventType: "password_reset_rate_limited",
        loginIdentifier: hashRegistrationEmail(email),
        statusCode: 429,
      });
      return NextResponse.json({
        ok: true,
        message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
      });
    }

    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "password_reset_requested",
      loginIdentifier: hashRegistrationEmail(email),
      statusCode: 200,
    });

    const result = await getPlatformPasswordResetRepository().requestReset({ email });
    if (result.reason === "token_created") {
      try {
        const delivery = await getPasswordResetDelivery().sendResetLink({
          email,
          expiresAt: result.expiresAt,
          resetToken: result.resetToken,
          userId: result.userId,
        });
        recordPasswordResetDeliveryOutcome({ outcome: delivery.mode === "not_configured" ? "not_configured" : "delivered", userId: result.userId });
      } catch {
        recordPasswordResetDeliveryOutcome({ outcome: "failed", userId: result.userId });
      }
    } else {
      recordPasswordResetDeliveryOutcome({ outcome: "not_requested" });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
  });
}
