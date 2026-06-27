import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { crowdSecMetricsFromDashboard } from "@/lib/server/crowdsec-admin-metrics";
import { isPortalAdminSession } from "@/lib/server/portal-admin";
import { portalSessionFromRequest } from "@/lib/server/portal-auth-gate";
import { getSecurityAuditDashboardRepository } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await portalSessionFromRequest(request);
  if (!isPortalAdminSession(session)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const dashboard = await getSecurityAuditDashboardRepository().dashboard();
  return NextResponse.json(crowdSecMetricsFromDashboard(dashboard));
}
