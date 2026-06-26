import { describe, expect, it, vi } from "vitest";

vi.stubEnv("NOF_PLATFORM_OAUTH_ISSUER", "https://forgath.ru");

import { GET as discovery } from "@/app/.well-known/openid-configuration/route";

describe("OIDC discovery route", () => {
  it("publishes the platform OIDC provider metadata without authentication", async () => {
    const response = await discovery();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authorization_endpoint: "https://forgath.ru/oauth/authorize",
      grant_types_supported: ["authorization_code"],
      id_token_signing_alg_values_supported: ["HS256"],
      issuer: "https://forgath.ru",
      response_types_supported: ["code"],
      scopes_supported: ["openid", "profile", "email"],
      token_endpoint: "https://forgath.ru/oauth/token",
      token_endpoint_auth_methods_supported: ["client_secret_post"],
      userinfo_endpoint: "https://forgath.ru/oauth/userinfo",
    });
  });
});
