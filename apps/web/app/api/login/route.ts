import type { NextRequest } from "next/server";

import {
  authCookieValueFromResponse,
  buildPortalLoginFailedRedirect,
  buildPortalLoginRedirect,
  copyAuthCookies,
  nofServiceLoginUrl,
} from "@/lib/server/nof-service-client";
import { decodeNofAuthToken } from "@/lib/server/nof-portal-auth";
import { normalizePortalLanguage } from "@/lib/portal-language";
import { safePortalReturnTo } from "@/lib/server/portal-auth-gate";
import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";
import { getUserPreferencesRepository } from "@/lib/server/user-preferences-repository";

function clientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safePortalReturnTo(String(formData.get("next") ?? "/"));
  const language = normalizePortalLanguage(formData.get("language"));
  const auditContext = {
    ip: clientIpFromRequest(request),
    method: "POST",
    path: "/api/login",
    userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
  };

  if (!username || !password) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "login_missing_credentials",
      loginIdentifier: username || undefined,
      statusCode: 400,
    });
    return buildPortalLoginFailedRedirect(next);
  }

  const upstreamForm = new URLSearchParams();
  upstreamForm.set("username", username);
  upstreamForm.set("password", password);

  const upstream = await fetch(nofServiceLoginUrl(), {
    body: upstreamForm,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual",
  });

  if (upstream.status !== 302 && upstream.status !== 303 && upstream.status !== 307) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: upstream.status === 429 ? "login_rate_limited" : "login_failed",
      loginIdentifier: username,
      statusCode: upstream.status,
    });
    return buildPortalLoginFailedRedirect(next);
  }

  const response = buildPortalLoginRedirect(next);
  copyAuthCookies(upstream, response);
  const authCookieValue = authCookieValueFromResponse(upstream);
  const userId = authCookieValue ? decodeNofAuthToken(authCookieValue)?.sub : undefined;
  await recordSecurityAuditEvent({
    ...auditContext,
    actorUserId: userId,
    actorUsername: username,
    eventType: "login_success",
    loginIdentifier: username,
    statusCode: upstream.status,
  });
  if (userId) {
    await getUserPreferencesRepository().upsert(userId, { language });
  }
  return response;
}
