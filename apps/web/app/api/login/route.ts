import type { NextRequest } from "next/server";

import {
  authCookieValueFromResponse,
  buildPortalLoginFailedRedirect,
  buildPortalLoginRedirect,
  copyAuthCookies,
  nofServiceLoginUrl,
} from "@/lib/server/nof-service-client";
import { authFailureCount, authRateLimit, clearAuthFailures, recordAuthFailure } from "@/lib/server/auth-abuse-protection";
import { getAdminUsersRepository } from "@/lib/server/admin-users-repository";
import { decodeNofAuthToken } from "@/lib/server/nof-portal-auth";
import { normalizePortalLanguage } from "@/lib/portal-language";
import { getPasswordPolicyStateRepository } from "@/lib/server/password-policy-state-repository";
import { safePortalReturnTo } from "@/lib/server/portal-auth-gate";
import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";
import { verifySmartCaptchaToken } from "@/lib/server/smartcaptcha";
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
  const smartToken = String(formData.get("smart-token") ?? "");
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

  const limit = authRateLimit(`login:${auditContext.ip}:${username.toLowerCase()}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: "login_rate_limited",
      loginIdentifier: username,
      statusCode: 429,
    });
    return buildPortalLoginFailedRedirect(next);
  }

  const failureKey = `login-fail:${auditContext.ip}:${username.toLowerCase()}`;
  if (authFailureCount(failureKey, { windowMs: 15 * 60 * 1000 }) >= 3) {
    const captchaOk = await verifySmartCaptchaToken({ ip: auditContext.ip, token: smartToken });
    if (!captchaOk) {
      await recordSecurityAuditEvent({
        ...auditContext,
        eventType: "login_captcha_required",
        loginIdentifier: username,
        statusCode: 400,
      });
      return buildPortalLoginFailedRedirect(next);
    }
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
    recordAuthFailure(failureKey, { windowMs: 15 * 60 * 1000 });
    await recordSecurityAuditEvent({
      ...auditContext,
      eventType: upstream.status === 429 ? "login_rate_limited" : "login_failed",
      loginIdentifier: username,
      statusCode: upstream.status,
    });
    return buildPortalLoginFailedRedirect(next);
  }

  const authCookieValue = authCookieValueFromResponse(upstream);
  const userId = authCookieValue ? decodeNofAuthToken(authCookieValue)?.sub : undefined;
  if (userId && (await getAdminUsersRepository().isAccessDenied(userId))) {
    await recordSecurityAuditEvent({
      ...auditContext,
      actorUserId: userId,
      actorUsername: username,
      eventType: "login_access_denied",
      loginIdentifier: username,
      statusCode: 403,
    });
    return buildPortalLoginFailedRedirect(next);
  }

  const response = buildPortalLoginRedirect(next);
  clearAuthFailures(failureKey);
  copyAuthCookies(upstream, response);
  if (userId) {
    const passwordPolicyState = await getPasswordPolicyStateRepository().stateForUser(userId);
    if (passwordPolicyState.mustRotatePassword) {
      response.headers.set("location", "/profile?password=rotation-required");
    }
  }
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
