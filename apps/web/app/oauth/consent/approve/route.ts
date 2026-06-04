import { type NextRequest, NextResponse } from "next/server";

import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
  normalizeOAuthScopes,
} from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";
import { portalLoginUrl, portalSessionFromRequest } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error, ok: false }, { status });
}

function redirectToCallback(redirectUri: string, params: Record<string, string>): NextResponse {
  const callbackUrl = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    callbackUrl.searchParams.set(key, value);
  }
  return new NextResponse(null, {
    headers: { location: callbackUrl.toString() },
    status: 303,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const responseType = String(form.get("response_type") ?? "");
  const scope = String(form.get("scope") ?? "");
  const state = String(form.get("state") ?? "");
  const nonce = String(form.get("nonce") ?? "");
  const decision = String(form.get("decision") ?? "");

  const client = findOAuthClient(clientId);
  if (!client) {
    return jsonError("invalid_client", 400);
  }
  if (responseType !== "code") {
    return jsonError("unsupported_response_type", 400);
  }
  if (!isAllowedOAuthRedirectUri(client.clientId, redirectUri)) {
    return jsonError("invalid_redirect_uri", 400);
  }
  if (!state || !nonce) {
    return jsonError("invalid_request", 400);
  }

  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return new NextResponse(null, {
      headers: { location: session.loginUrl || portalLoginUrl("/oauth/consent") },
      status: 303,
    });
  }

  if (decision !== "approve") {
    return redirectToCallback(redirectUri, { error: "access_denied", state });
  }

  const issued = await getOAuthAuthorizationCodeRepository().issue({
    clientId: client.clientId,
    nonce,
    platformUserId: session.user.id,
    redirectUri,
    scopes: normalizeOAuthScopes(client.clientId, scope),
    state,
    ttlSeconds: 120,
  });

  return redirectToCallback(redirectUri, { code: issued.code, state });
}
