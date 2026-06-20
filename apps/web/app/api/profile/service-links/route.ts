import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";
import { fetchNofHtLink, unlinkNofHt } from "@/lib/server/service-links-contract";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  return NextResponse.json({ links: [await fetchNofHtLink(userId)] });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const serviceKey = request.nextUrl.searchParams.get("serviceKey");
  if (serviceKey !== "nof-ht") {
    return NextResponse.json({ error: "unsupported_service" }, { status: 400 });
  }

  const link = await unlinkNofHt(userId);
  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "profile_service_unlinked",
    method: "DELETE",
    path: `/api/profile/service-links?serviceKey=${encodeURIComponent(serviceKey)}`,
    statusCode: 200,
  });

  return NextResponse.json({ link });
}
