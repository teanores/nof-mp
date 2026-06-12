import crypto from "node:crypto";

import type { OAuthConsentChallengeRecord } from "@/lib/server/oauth-consent-challenge-repository";

interface SignedConsentPayload {
  challengeId: string;
  clientId: string;
  expiresAt: string;
  nonce: string;
  platformUserId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

function consentSecret(): string {
  const secret = process.env.NOF_PLATFORM_OAUTH_JWT_SECRET ?? process.env.NOF_AUTH_SECRET_KEY ?? process.env.SECRET_KEY;
  if (!secret) {
    throw new Error("NOF Platform OAuth consent signing secret is not configured");
  }
  return secret;
}

function encodeJson(payload: SignedConsentPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret = consentSecret()): string {
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signOAuthConsentRecord(record: OAuthConsentChallengeRecord, secret = consentSecret()): string {
  const payload: SignedConsentPayload = {
    challengeId: record.challengeId,
    clientId: record.clientId,
    expiresAt: record.expiresAt,
    nonce: record.nonce,
    platformUserId: record.platformUserId,
    redirectUri: record.redirectUri,
    scopes: record.scopes,
    state: record.state,
  };
  const encodedPayload = encodeJson(payload);
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyOAuthConsentToken(
  token: string,
  platformUserId: string,
  now = new Date(),
  secret = consentSecret(),
): OAuthConsentChallengeRecord | undefined {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return undefined;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return undefined;
  }

  let payload: SignedConsentPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SignedConsentPayload;
  } catch {
    return undefined;
  }

  if (payload.platformUserId !== platformUserId || Date.parse(payload.expiresAt) <= now.getTime()) {
    return undefined;
  }

  return payload;
}
