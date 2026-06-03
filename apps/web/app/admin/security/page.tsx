import { AdminSecurityPage } from "@/components/AdminSecurityPage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import { getSecurityAuditDashboardRepository } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminSecurityRoute() {
  const session = await requirePortalPageSession("/admin/security");
  requirePortalAdminSession(session);
  const dashboard = await getSecurityAuditDashboardRepository().dashboard();

  return <AdminSecurityPage dashboard={dashboard} session={session} />;
}
