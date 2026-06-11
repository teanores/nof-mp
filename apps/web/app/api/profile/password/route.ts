import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { getPlatformPasswordRepository } from "@/lib/server/platform-password-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "password_fields_required" }, { status: 400 });
  }

  const result = await getPlatformPasswordRepository().changePassword({ currentPassword, newPassword, userId });
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
