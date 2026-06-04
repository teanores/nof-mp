import { type NextRequest, NextResponse } from "next/server";

import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
} from "@/lib/server/oauth-client-registry";
import { portalLoginUrl, portalSessionFromRequest } from "@/lib/server/portal-auth-gate";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error, ok: false }, { status });
}

function currentPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function consentUrl(request: NextRequest): string {
  const url = new URL("/oauth/consent", request.nextUrl.origin);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key !== "consent") {
      url.searchParams.append(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = request.nextUrl.searchParams.get("client_id") ?? "";
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";
  const responseType = request.nextUrl.searchParams.get("response_type") ?? "";
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const nonce = request.nextUrl.searchParams.get("nonce") ?? "";

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
      headers: { location: session.loginUrl || portalLoginUrl(currentPath(request)) },
      status: 303,
    });
  }

  return new NextResponse(null, {
    headers: { location: consentUrl(request) },
    status: 303,
  });
}
