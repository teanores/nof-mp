import { PortalOverviewPage } from "@/components/PortalOverviewPage";
import { requirePortalPageSession } from "@/lib/server/portal-auth-gate";
import React from "react";

export default async function OverviewPage() {
  const initialSession = await requirePortalPageSession("/overview");
  return <PortalOverviewPage initialSession={initialSession} />;
}
