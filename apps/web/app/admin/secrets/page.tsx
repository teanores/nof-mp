import { AdminSecretsPage } from "@/components/AdminSecretsPage";
import { requirePortalAdminSession } from "@/lib/server/portal-admin";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import { getSecretRotationRegistryRepository } from "@/lib/server/secret-rotation-registry";

export default async function AdminSecretsRoute() {
  const session = await requirePortalPageSession("/admin/secrets");
  requirePortalAdminSession(session);
  const registry = await getSecretRotationRegistryRepository().listRegistry();

  return <AdminSecretsPage registry={registry} />;
}
