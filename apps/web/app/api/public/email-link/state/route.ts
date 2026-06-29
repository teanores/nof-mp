import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlatformEmailLinkRepository } from "@/lib/server/platform-email-link-repository";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "invalid_link", ok: false }, { status: 400 });
  }

  const result = await getPlatformEmailLinkRepository().readLinkState({ token });
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_link", ok: false }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    state: {
      expiresAt: result.state.expiresAt.toISOString(),
      hasEmail: result.state.hasEmail,
      status: result.state.status,
      telegram: result.state.telegram,
    },
  });
}
