import { UserProfilePage } from "@/components/UserProfilePage";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";

export default async function ProfileRoute() {
  await requirePortalPageSession("/profile");
  return <UserProfilePage />;
}
