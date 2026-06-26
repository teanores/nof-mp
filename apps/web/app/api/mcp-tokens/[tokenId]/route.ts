import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

function deprecatedMcpTokenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "mcp_tokens_owned_by_nof_tt",
      mcpUrl: "https://task-tracker.forgath.ru/api/mcp",
      owner: "nof-tt",
    },
    { status: 410 },
  );
}

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

  await context.params;
  return deprecatedMcpTokenResponse();
}
