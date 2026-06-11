import { type NextRequest, NextResponse } from "next/server";

import { getPasswordResetDelivery } from "@/lib/server/password-reset-delivery";
import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email : "";

  if (email) {
    const result = await getPlatformPasswordResetRepository().requestReset({ email });
    if (result.reason === "token_created") {
      await getPasswordResetDelivery()
        .sendResetLink({
          email,
          expiresAt: result.expiresAt,
          resetToken: result.resetToken,
          userId: result.userId,
        })
        .catch(() => undefined);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
  });
}
