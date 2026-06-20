import { buildPortalLogoutResponse } from "@/lib/server/logout";
import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

import type { NextRequest } from "next/server";

async function logout(request: NextRequest) {
  const session = await portalSessionFromRequest(request);
  if (session.authenticated) {
    await recordSecurityAuditEvent({
      actorUserId: session.user?.id,
      actorUsername: session.user?.username,
      eventType: "logout_success",
      method: request.method,
      path: "/api/logout",
      statusCode: 303,
    });
  }

  return buildPortalLogoutResponse();
}

export const GET = logout;
export const POST = logout;
