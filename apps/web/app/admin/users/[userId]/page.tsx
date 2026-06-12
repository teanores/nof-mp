import { notFound } from "next/navigation";

import { AdminUserDetailPage } from "@/components/AdminUserDetailPage";
import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await requirePortalPageSession(`/admin/users/${encodeURIComponent(userId)}`);
  requirePortalAdminSession(session);

  const user = await getAdminUsersRepository().getUserById(userId);
  if (!user) {
    notFound();
  }

  return <AdminUserDetailPage user={user} />;
}
