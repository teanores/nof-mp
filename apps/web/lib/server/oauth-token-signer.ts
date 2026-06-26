import { createHmac, timingSafeEqual } from "node:crypto";

interface OAuthTokenClaims {
  aud: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  name?: string;
  nonce: string;
  preferred_username?: string;
  role?: string;
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

export function verifyOAuthJwt(token: string): OAuthTokenClaims | undefined {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return undefined;
  }

  const expectedSignature = createHmac("sha256", signingSecret()).update(`${header}.${payload}`).digest("base64url");
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return undefined;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthTokenClaims;
    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      return undefined;
    }
    if (claims.iss !== oauthIssuer()) {
      return undefined;
    }
    return claims;
  } catch {
    return undefined;
  }
}

export function oauthIssuer(): string {
  return process.env.NOF_PLATFORM_OAUTH_ISSUER ?? "https://forgath.ru";
}
