import { type NextRequest, NextResponse } from "next/server";

import { authenticateOAuthClient } from "@/lib/server/oauth-client-auth";
import { findOAuthClient, isAllowedOAuthRedirectUri } from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";
import { getNofPortalAuthRepository } from "@/lib/server/nof-portal-auth";
import { oauthIssuer, signOAuthJwt } from "@/lib/server/oauth-token-signer";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "");
  const clientSecret = String(form.get("client_secret") ?? "");
  const code = String(form.get("code") ?? "");
  const grantType = String(form.get("grant_type") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");

  const client = findOAuthClient(clientId);
  if (!client) {
    return jsonError("invalid_client", 400);
  }
  if (!authenticateOAuthClient(client.clientId, clientSecret)) {
    return jsonError("invalid_client", 401);
  }
  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", 400);
  }
  if (!code) {
    return jsonError("invalid_request", 400);
  }
  if (!isAllowedOAuthRedirectUri(client.clientId, redirectUri)) {
    return jsonError("invalid_redirect_uri", 400);
  }

  const redeemed = await getOAuthAuthorizationCodeRepository().redeem({
    clientId: client.clientId,
    code,
    redirectUri,
  });
  if (!redeemed.ok) {
    return jsonError("invalid_grant", 400);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const scope = redeemed.record.scopes.join(" ");
  const shouldLoadPlatformUser = redeemed.record.scopes.includes("profile") || redeemed.record.scopes.includes("email");
  const platformUser = shouldLoadPlatformUser
    ? await getNofPortalAuthRepository().userById(redeemed.record.platformUserId).catch(() => undefined)
    : undefined;
  const profileClaims =
    redeemed.record.scopes.includes("profile") && platformUser
      ? {
          ...(platformUser.username ? { name: platformUser.username, preferred_username: platformUser.username } : {}),
          ...(platformUser.role?.name ? { role: platformUser.role.name } : {}),
        }
      : {};
  const emailClaims =
    redeemed.record.scopes.includes("email") && platformUser?.email
      ? { email: platformUser.email, email_verified: Boolean(platformUser.emailVerified) }
      : redeemed.record.scopes.includes("email")
        ? { email_verified: false }
        : {};
  const claims = {
    aud: client.clientId,
    exp: nowSeconds + 300,
    iat: nowSeconds,
    iss: oauthIssuer(),
    nonce: redeemed.record.nonce,
    ...emailClaims,
    ...profileClaims,
    scope,
    sub: redeemed.record.platformUserId,
  };
  const token = signOAuthJwt(claims);

  return NextResponse.json({
    access_token: token,
    expires_in: 300,
    id_token: token,
    scope,
    token_type: "Bearer",
  });
}
