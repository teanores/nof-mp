import { PortalOverviewPage } from "@/components/PortalOverviewPage";
import { dragonForgeAuthCookieName, getDragonForgeAuthRepository } from "@/lib/server/dragon-forge-auth";
import type { ForgePortalSession } from "@/lib/types";
import { cookies } from "next/headers";
import React from "react";

export default async function OverviewPage() {
  let initialSession: ForgePortalSession | undefined;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(dragonForgeAuthCookieName)?.value;
    initialSession = await getDragonForgeAuthRepository().sessionFromCookie(token);
  } catch {
    initialSession = undefined;
  }

  return <PortalOverviewPage initialSession={initialSession} />;
}
