import { type NextRequest, NextResponse } from "next/server";

import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email : "";

  if (email) {
    await getPlatformPasswordResetRepository().requestReset({ email });
  }

  return NextResponse.json({
    ok: true,
    message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
  });
}
