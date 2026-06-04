import { type NextRequest, NextResponse } from "next/server";

import { authenticateOAuthClient } from "@/lib/server/oauth-client-auth";
import { findOAuthClient, isAllowedOAuthRedirectUri } from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";
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
  const claims = {
    aud: client.clientId,
    email_verified: false,
    exp: nowSeconds + 300,
    iat: nowSeconds,
    iss: oauthIssuer(),
    nonce: redeemed.record.nonce,
    scope: redeemed.record.scopes.join(" "),
    sub: redeemed.record.platformUserId,
  };
  const token = signOAuthJwt(claims);

  return NextResponse.json({
    access_token: token,
    expires_in: 300,
    id_token: token,
    scope: redeemed.record.scopes.join(" "),
    token_type: "Bearer",
  });
}
