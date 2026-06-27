import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createPresignedMediaUrl, mediaStorageLimits } from "@/lib/server/media-storage";
import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { objectKey?: unknown };
  const objectKey = typeof body.objectKey === "string" ? body.objectKey : "";
  const userPrefix = `avatars/${session.user.id.replace(/[^A-Za-z0-9._-]+/g, "-")}/`;
  if (!objectKey.startsWith(userPrefix)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    expiresInSeconds: mediaStorageLimits.presignExpiresSeconds,
    readUrl: createPresignedMediaUrl({ method: "GET", objectKey }),
  });
}
