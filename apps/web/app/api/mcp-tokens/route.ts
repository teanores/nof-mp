import { type NextRequest, NextResponse } from "next/server";

import { getMcpTokenRepository } from "@/lib/server/mcp-token-repository";
import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import type { CreateMcpTokenInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requirePortalApiSession(request);
  if (authError) {
    return authError;
  }

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authenticated user was not loaded" }, { status: 401 });
  }

  const tokens = await getMcpTokenRepository().listActive(userId);
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const authError = await requirePortalApiSession(request);
  if (authError) {
    return authError;
  }

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authenticated user was not loaded" }, { status: 401 });
  }

  const input = (await request.json().catch(() => ({}))) as Partial<CreateMcpTokenInput>;
  if (typeof input.name !== "string" || !input.name.trim()) {
    return NextResponse.json({ error: "Token name is required" }, { status: 400 });
  }

  try {
    const created = await getMcpTokenRepository().create(userId, {
      name: input.name,
      projectKey: input.projectKey,
      scopes: input.scopes,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP token was not created" }, { status: 400 });
  }
}
