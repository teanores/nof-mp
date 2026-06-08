import { AdminSecurityPage } from "@/components/AdminSecurityPage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import { getSecurityAuditDashboardRepository, recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminSecurityRoute() {
  const session = await requirePortalPageSession("/admin/security");
  requirePortalAdminSession(session);
  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "app_authenticated_request",
    method: "GET",
    path: "/admin/security",
    statusCode: 200,
    userAgent: "server-component",
  });
  const dashboard = await getSecurityAuditDashboardRepository().dashboard();

  return <AdminSecurityPage dashboard={dashboard} session={session} />;
}
