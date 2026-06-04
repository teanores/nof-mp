import { createHmac } from "node:crypto";

interface OAuthTokenClaims {
  aud: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  nonce: string;
  scope: string;
  sub: string;
}

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signingSecret(): string {
  const secret = process.env.NOF_PLATFORM_OAUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("NOF Platform OAuth JWT signing secret is not configured");
  }
  return secret;
}

export function signOAuthJwt(claims: OAuthTokenClaims): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson(claims);
  const signature = createHmac("sha256", signingSecret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function oauthIssuer(): string {
  return process.env.NOF_PLATFORM_OAUTH_ISSUER ?? "https://forgath.ru";
}
