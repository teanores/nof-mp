import { type NextRequest, NextResponse } from "next/server";

import { getMcpTokenRepository } from "@/lib/server/mcp-token-repository";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, context: { params: Promise<{ tokenId: string }> }) {
  const authError = await requirePortalApiSession(request);
  if (authError) {
    return authError;
  }

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authenticated user was not loaded" }, { status: 401 });
  }

  const { tokenId } = await context.params;
  const revoked = await getMcpTokenRepository().revoke(userId, tokenId);
  if (!revoked) {
    return NextResponse.json({ error: "MCP token was not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
