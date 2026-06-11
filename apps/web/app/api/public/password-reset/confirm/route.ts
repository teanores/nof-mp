import { type NextRequest, NextResponse } from "next/server";

import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as { newPassword?: unknown; token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token || !newPassword) {
    return NextResponse.json({ error: "password_reset_fields_required" }, { status: 400 });
  }

  const result = await getPlatformPasswordResetRepository().confirmReset({ newPassword, token });
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    {
      error: result.reason,
      ...(result.errors ? { errors: result.errors } : {}),
    },
    { status: 400 },
  );
}
