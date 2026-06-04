import { type NextRequest, NextResponse } from "next/server";

import { findOAuthClient, isAllowedOAuthRedirectUri } from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "");
  const code = String(form.get("code") ?? "");
  const grantType = String(form.get("grant_type") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");

  const client = findOAuthClient(clientId);
  if (!client) {
    return jsonError("invalid_client", 400);
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

  return NextResponse.json({
    claims: {
      email_verified: false,
      sub: redeemed.record.platformUserId,
    },
    expires_in: 300,
    scope: redeemed.record.scopes.join(" "),
    token_type: "Bearer",
  });
}
