import { notFound } from "next/navigation";

import { AdminUserDetailPage } from "@/components/AdminUserDetailPage";
import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import { getSecurityAuditDashboardRepository, recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";
import { fetchNofHtLink } from "@/lib/server/service-links-contract";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await requirePortalPageSession(`/admin/users/${encodeURIComponent(userId)}`);
  requirePortalAdminSession(session);

  const user = await getAdminUsersRepository().getUserById(userId);
  if (!user) {
    notFound();
  }

  await recordSecurityAuditEvent({
    actorUserId: session.user?.id,
    actorUsername: session.user?.username,
    eventType: "admin_user_detail_view",
    method: "GET",
    path: `/admin/users/${encodeURIComponent(user.id)}`,
    statusCode: 200,
  });

  const serviceLinks = [await fetchNofHtLink(user.id)];
  const recentActivity = await getSecurityAuditDashboardRepository()
    .recentEventsForActor(user.id)
    .catch(() => []);

  return <AdminUserDetailPage recentActivity={recentActivity} serviceLinks={serviceLinks} user={user} />;
}
