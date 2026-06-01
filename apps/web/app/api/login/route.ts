import type { NextRequest } from "next/server";

import {
  authCookieValueFromResponse,
  buildPortalLoginFailedRedirect,
  buildPortalLoginRedirect,
  copyAuthCookies,
  dragonForgeInternalLoginUrl,
} from "@/lib/server/dragon-forge-login";
import { decodePlatformAuthToken } from "@/lib/server/platform-auth";
import { normalizePortalLanguage } from "@/lib/portal-language";
import { safePortalReturnTo } from "@/lib/server/portal-auth-gate";
import { getUserPreferencesRepository } from "@/lib/server/user-preferences-repository";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safePortalReturnTo(String(formData.get("next") ?? "/"));
  const language = normalizePortalLanguage(formData.get("language"));

  if (!username || !password) {
    return buildPortalLoginFailedRedirect(next);
  }

  const upstreamForm = new URLSearchParams();
  upstreamForm.set("username", username);
  upstreamForm.set("password", password);

  const upstream = await fetch(dragonForgeInternalLoginUrl(), {
    body: upstreamForm,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual",
  });

  if (upstream.status !== 302 && upstream.status !== 303 && upstream.status !== 307) {
    return buildPortalLoginFailedRedirect(next);
  }

  const response = buildPortalLoginRedirect(next);
  copyAuthCookies(upstream, response);
  const authCookieValue = authCookieValueFromResponse(upstream);
  const userId = authCookieValue ? decodePlatformAuthToken(authCookieValue)?.sub : undefined;
  if (userId) {
    await getUserPreferencesRepository().upsert(userId, { language });
  }
  return response;
}
