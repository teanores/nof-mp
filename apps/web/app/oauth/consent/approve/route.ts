import { type NextRequest, NextResponse } from "next/server";

import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
} from "@/lib/server/oauth-client-registry";
import { getOAuthAuthorizationCodeRepository } from "@/lib/server/oauth-authorization-code-repository";
import { getOAuthConsentChallengeRepository } from "@/lib/server/oauth-consent-challenge-repository";
import { verifyOAuthConsentToken } from "@/lib/server/oauth-consent-token";
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

function redirectToPlatformPath(path: string): NextResponse {
  return new NextResponse(null, {
    headers: { location: path },
    status: 303,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const challengeId = String(form.get("challenge_id") ?? "");
  const consentToken = String(form.get("consent_token") ?? "");
  const decision = String(form.get("decision") ?? "");

  const session = await portalSessionFromRequest(request);
  if (!session.authenticated || !session.user?.id) {
    return new NextResponse(null, {
      headers: { location: session.loginUrl || portalLoginUrl("/oauth/consent") },
      status: 303,
    });
  }

  const consumedChallenge = await getOAuthConsentChallengeRepository().consume({
    challengeId,
    platformUserId: session.user.id,
  });
  const challenge = consumedChallenge.ok
    ? consumedChallenge.record
    : verifyOAuthConsentToken(consentToken, session.user.id);
  if (!challenge) {
    return jsonError("invalid_consent_challenge", 400);
  }

  const client = findOAuthClient(challenge.clientId);
  if (!client) {
    return jsonError("invalid_client", 400);
  }
  if (!isAllowedOAuthRedirectUri(client.clientId, challenge.redirectUri)) {
    return jsonError("invalid_redirect_uri", 400);
  }

  if (decision !== "approve") {
    if (client.cancelReturnPath) {
      return redirectToPlatformPath(client.cancelReturnPath);
    }
    return redirectToCallback(challenge.redirectUri, { error: "access_denied", state: challenge.state });
  }

  const issued = await getOAuthAuthorizationCodeRepository().issue({
    clientId: client.clientId,
    nonce: challenge.nonce,
    platformUserId: session.user.id,
    redirectUri: challenge.redirectUri,
    scopes: challenge.scopes,
    state: challenge.state,
    ttlSeconds: 120,
  });

  return redirectToCallback(challenge.redirectUri, { code: issued.code, state: challenge.state });
}
