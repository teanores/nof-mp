import { LoginPage } from "@/components/LoginPage";
import { portalPageSession, safePortalReturnTo } from "@/lib/server/portal-auth-gate";
import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";
import { redirect } from "next/navigation";
import React from "react";

interface LoginRouteProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  const params = await searchParams;
  const session = await portalPageSession();
  if (session.authenticated) {
    redirect(safePortalReturnTo(params.next || "/overview"));
  }
  const settings = await getPlatformSettingsRepository().getSettings();

  return <LoginPage error={params.error} next={params.next} registrationPaused={settings.registrationPaused} />;
}
