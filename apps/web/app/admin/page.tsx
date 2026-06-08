import { AdminHomePage } from "@/components/AdminHomePage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export default async function AdminHomeRoute() {
  const session = await requirePortalPageSession("/admin");
  requirePortalAdminSession(session);

  return <AdminHomePage session={session} />;
}
