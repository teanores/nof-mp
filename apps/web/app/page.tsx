import { PortalOverviewPage } from "@/components/PortalOverviewPage";
import { portalPageSession } from "@/lib/server/portal-auth-gate";

export default async function Home() {
  const initialSession = await portalPageSession();
  return <PortalOverviewPage initialSession={initialSession} />;
}
