import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildMediaObjectKey,
  createPresignedMediaUrl,
  mediaStorageLimits,
  validateImageUploadRequest,
} from "@/lib/server/media-storage";
import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    contentType?: unknown;
    fileName?: unknown;
    magicBytesBase64?: unknown;
    sizeBytes?: unknown;
  };
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;
  const magicBytes = typeof body.magicBytesBase64 === "string" ? Buffer.from(body.magicBytesBase64, "base64") : Buffer.alloc(0);
  const validation = validateImageUploadRequest({ contentType, fileName, magicBytes, sizeBytes });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const objectKey = buildMediaObjectKey({ extension: validation.extension, userId: session.user.id });
  const uploadUrl = createPresignedMediaUrl({ contentType, method: "PUT", objectKey });
  return NextResponse.json({
    bucket: process.env.NOF_MEDIA_S3_BUCKET_NOF_MP ?? "nof-mp",
    expiresInSeconds: mediaStorageLimits.presignExpiresSeconds,
    objectKey,
    uploadUrl,
  });
}
