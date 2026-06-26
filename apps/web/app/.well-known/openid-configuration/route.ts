import { NextResponse } from "next/server";

import { oauthIssuer } from "@/lib/server/oauth-token-signer";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const issuer = oauthIssuer();

  return NextResponse.json({
    authorization_endpoint: `${issuer}/oauth/authorize`,
    grant_types_supported: ["authorization_code"],
    id_token_signing_alg_values_supported: ["HS256"],
    issuer,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint: `${issuer}/oauth/token`,
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
  });
}
