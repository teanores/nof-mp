import { type NextRequest, NextResponse } from "next/server";

import { verifyOAuthJwt } from "@/lib/server/oauth-token-signer";

export const dynamic = "force-dynamic";

function invalidToken(): NextResponse {
  return NextResponse.json({ error: "invalid_token", ok: false }, { status: 401 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return invalidToken();
  }

  const claims = verifyOAuthJwt(token);
  if (!claims) {
    return invalidToken();
  }

  return NextResponse.json({
    ...(claims.email ? { email: claims.email } : {}),
    ...(typeof claims.email_verified === "boolean" ? { email_verified: claims.email_verified } : {}),
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.preferred_username ? { preferred_username: claims.preferred_username } : {}),
    sub: claims.sub,
  });
}
