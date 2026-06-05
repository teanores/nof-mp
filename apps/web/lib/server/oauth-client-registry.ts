export interface OAuthClientRegistration {
  clientId: string;
  displayName: string;
  productKey: "nof-ht" | "nof-tt";
  redirectUris: string[];
  scopes: string[];
}

export const oauthClientRegistry: OAuthClientRegistration[] = [
  {
    clientId: "nof-tt",
    displayName: "Forge Tasks",
    productKey: "nof-tt",
    redirectUris: ["https://forge-tasks.forgath.ru/auth/platform/callback"],
    scopes: ["openid", "profile", "email"],
  },
  {
    clientId: "nof-ht",
    displayName: "Habit Tracker",
    productKey: "nof-ht",
    redirectUris: ["https://habit-tracker.forgath.ru/auth/platform/callback"],
    scopes: ["openid", "profile", "email"],
  },
];

export function findOAuthClient(clientId: string): OAuthClientRegistration | undefined {
  return oauthClientRegistry.find((client) => client.clientId === clientId);
}

export function isOAuthManagedProduct(productKey: string): boolean {
  return oauthClientRegistry.some((client) => client.productKey === productKey);
}

export function isAllowedOAuthRedirectUri(clientId: string, redirectUri: string): boolean {
  return findOAuthClient(clientId)?.redirectUris.includes(redirectUri) ?? false;
}

export function normalizeOAuthScopes(clientId: string, scope: string): string[] {
  const client = findOAuthClient(clientId);
  if (!client) {
    return [];
  }

  const requested = scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set(client.scopes);
  const normalized = requested.filter((value, index) => allowed.has(value) && requested.indexOf(value) === index);

  return normalized.length > 0 ? normalized : ["openid"];
}
