import { LoginPage } from "@/components/LoginPage";
import { portalPageSession, safePortalReturnTo } from "@/lib/server/portal-auth-gate";
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

  return <LoginPage error={params.error} next={params.next} />;
}
