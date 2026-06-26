import { type NextRequest, NextResponse } from "next/server";

import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  requirePortalAdminSession(session);

  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { targetUserId?: unknown };
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  if (!targetUserId) {
    return NextResponse.json({ error: "target_user_required" }, { status: 400 });
  }
  if (targetUserId === userId) {
    return NextResponse.json({ error: "cannot_merge_self" }, { status: 400 });
  }

  return NextResponse.json({ error: "multi_alias_model_required" }, { status: 409 });
}
