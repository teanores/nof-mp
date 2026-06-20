import { AdminEventsPage } from "@/components/AdminEventsPage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import { getSecurityAuditDashboardRepository } from "@/lib/server/security-audit-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminEventsRoute() {
  const session = await requirePortalPageSession("/admin/events");
  requirePortalAdminSession(session);

  const events = await getSecurityAuditDashboardRepository()
    .recentAccountEvents()
    .catch(() => []);

  return <AdminEventsPage events={events} />;
}
