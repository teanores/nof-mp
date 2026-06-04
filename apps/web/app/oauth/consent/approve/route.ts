import { type NextRequest, NextResponse } from "next/server";

import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
} from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";
import { getOAuthConsentChallengeRepository } from "@/lib/server/oauth-consent-challenge-repository";
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
  const challengeId = String(form.get("challenge_id") ?? "");
  const decision = String(form.get("decision") ?? "");

  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return new NextResponse(null, {
      headers: { location: session.loginUrl || portalLoginUrl("/oauth/consent") },
      status: 303,
    });
  }

  const challenge = await getOAuthConsentChallengeRepository().consume({
    challengeId,
    platformUserId: session.user.id,
  });
  if (!challenge.ok) {
    return jsonError("invalid_consent_challenge", 400);
  }

  const client = findOAuthClient(challenge.record.clientId);
  if (!client) {
    return jsonError("invalid_client", 400);
  }
  if (!isAllowedOAuthRedirectUri(client.clientId, challenge.record.redirectUri)) {
    return jsonError("invalid_redirect_uri", 400);
  }

  if (decision !== "approve") {
    return redirectToCallback(challenge.record.redirectUri, { error: "access_denied", state: challenge.record.state });
  }

  const issued = await getOAuthAuthorizationCodeRepository().issue({
    clientId: client.clientId,
    nonce: challenge.record.nonce,
    platformUserId: session.user.id,
    redirectUri: challenge.record.redirectUri,
    scopes: challenge.record.scopes,
    state: challenge.record.state,
    ttlSeconds: 120,
  });

  return redirectToCallback(challenge.record.redirectUri, { code: issued.code, state: challenge.record.state });
}
