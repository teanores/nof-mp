import { type NextRequest, NextResponse } from "next/server";

import { getPasswordResetDelivery } from "@/lib/server/password-reset-delivery";
import { recordPasswordResetDeliveryOutcome } from "@/lib/server/password-reset-delivery-outcome";
import { getPlatformPasswordResetRepository, normalizePasswordResetEmail } from "@/lib/server/platform-password-reset-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? normalizePasswordResetEmail(body.email) : "";

  if (email) {
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
