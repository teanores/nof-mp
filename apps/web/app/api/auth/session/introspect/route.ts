import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    productKey?: unknown;
  };
  const productKey = String(body.productKey ?? "");

  if (!productKey) {
    return NextResponse.json(
      {
        active: false,
        allowed: false,
        error: "invalid_request",
      },
      { status: 400 },
    );
  }

  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return NextResponse.json(
      {
        active: false,
        allowed: false,
        error: "Authentication required",
        productKey,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    active: true,
    allowed: true,
    platformUserId: session.user.id,
    productKey,
    role: session.user.role?.name ?? "user",
  });
}
