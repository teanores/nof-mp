import { UserProfilePage } from "@/components/UserProfilePage";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export default async function MeRoute() {
  await requirePortalPageSession("/me");
  return <UserProfilePage />;
}
