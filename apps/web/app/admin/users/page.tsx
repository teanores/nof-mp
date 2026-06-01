import { AdminUsersPage } from "@/components/AdminUsersPage";
import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export default async function AdminUsersRoute() {
  const session = await requirePortalPageSession("/admin/users");
  requirePortalAdminSession(session);
  const users = await getAdminUsersRepository().listUsers();

  return <AdminUsersPage users={users} />;
}
