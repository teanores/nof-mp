import { AdminSecurityPage } from "@/components/AdminSecurityPage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export default async function AdminSecurityRoute() {
  const session = await requirePortalPageSession("/admin/security");
  requirePortalAdminSession(session);

  return <AdminSecurityPage session={session} />;
}
