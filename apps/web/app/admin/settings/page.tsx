import { AdminSettingsPage } from "@/components/AdminSettingsPage";
import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

export default async function AdminSettingsRoute() {
  const session = await requirePortalPageSession("/admin/settings");
  requirePortalAdminSession(session);
  const settings = await getPlatformSettingsRepository().getSettings();

  return <AdminSettingsPage initialSettings={settings} />;
}
