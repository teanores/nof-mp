# NOF Platform OAuth Identity Environment Contract

Status: draft for Sprint 4 local verification.
Scope: `nof-mp` OAuth identity provider.

This file documents variable names, ownership and rotation expectations only.
Do not store or paste real secret values here.

## Platform Variables

`NOF_AUTH_SECRET_KEY`

- Owner: `nof-mp`, shared operationally with legacy `nof-service` during decomposition.
- Purpose: verifies HS256 JWTs issued by legacy `nof-service` (legacy session cookie `auth_token`).
- Consumers: `apps/web/lib/server/nof-portal-auth.ts` → `decodeNofAuthToken`.
- Dual-key rotation: while both `NOF_AUTH_SECRET_KEY` and legacy `SECRET_KEY` are configured, `nof-mp` must verify tokens signed by either key. This avoids forced logout during the owner-approved transition window.
- Runtime secret rotation window: when the legacy issuer key itself is rotated, keep the old key in `SECRET_KEY_PREVIOUS` or `NOF_AUTH_SECRET_KEY_PREVIOUS` until UAT confirms old sessions and new logins are safe.
- Fallback: falls back to `SECRET_KEY` when the purpose-specific variable is absent.
- Rotation: coordinate with legacy `nof-service` secret store. Remove or reduce the legacy fallback only after the dual-key transition has passed UAT and `NOF-MP-16` is ready to close.
- Secret handling: never expose to browser JavaScript, logs, Wiki, tracker comments or build output.

`NOF_PLATFORM_OAUTH_JWT_SECRET`

- Owner: `nof-mp`.
- Purpose: signs NOF Platform OAuth `access_token` and `id_token` JWTs.
- Consumers: `apps/web/app/oauth/token/route.ts` through `oauth-token-signer.ts`.
- Required for: any `/oauth/token` success response.
- Rotation: rotate with a coordinated product rollout. During rotation, product services need a dual-verify window or an approved short maintenance window.
- Secret handling: never expose to browser JavaScript, logs, Wiki, tracker comments or build output.

`NOF_PLATFORM_OAUTH_ISSUER`

- Owner: `nof-mp`.
- Purpose: issuer claim in signed OAuth JWTs.
- Default in code: `https://forgath.ru`.
- Consumers: product callback verification in `nof-tt` and `nof-ht`.
- Secret handling: not a secret, but keep it consistent across environments.

`NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_<CLIENT_ID>`

- Owner: `nof-mp`, shared operationally with the owning product service through secret management.
- Purpose: SHA-256 hash of a product OAuth client secret used by `/oauth/token`.
- Naming rule: uppercase client id, non-alphanumeric characters replaced with `_`.
- Current expected names:
  - `NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT`
  - `NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_HT`
- Consumers: `apps/web/app/oauth/token/route.ts` through `oauth-client-auth.ts`.
- Secret handling: store only the hash in `nof-mp`; store the raw client secret only in the product service secret store.
- Rotation: create a new product secret and matching platform hash together. Do not log either the raw secret or the hash during rotation.

## Product Variables

Each product service needs equivalent local variables for callback implementation.
Names may follow the service's conventions, but must cover:

- NOF Platform OAuth issuer, expected value matching `NOF_PLATFORM_OAUTH_ISSUER`.
- NOF Platform token endpoint URL.
- Product OAuth client id: `nof-tt` or `nof-ht`.
- Product OAuth client secret raw value, stored only in the product service secret store.
- JWT verification secret or key material matching the current nof-mp signing strategy.
- Product callback base URL.

## Local Verification Rules

- Use local environment values only.
- Do not test against production without explicit owner approval.
- Do not print env values.
- Tests may use fake deterministic values inside test code.
- Local tests must prove:
  - missing client secret is rejected;
  - invalid client secret is rejected;
  - signed JWT has expected issuer and audience;
  - email claims are absent unless `email` scope was granted.

## Production Readiness Checklist

- `NOF_PLATFORM_OAUTH_JWT_SECRET` exists in platform runtime secret store.
- `NOF_PLATFORM_OAUTH_ISSUER` matches the public platform origin.
- `NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_TT` exists when nof-tt callback is enabled.
- `NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_NOF_HT` exists when nof-ht callback is enabled.
- Product services have matching raw client secrets in their own secret stores.
- Product services verify signed JWTs before linking or login.
- Product services do not create synthetic users silently.
- Product services do not continue stale sessions for another local user.

## Stop Conditions

- Any implementation requires printing a real secret value.
- Any product wants to call `/oauth/token` from browser JavaScript.
- Any product treats email as verified before `email_verified=true` is finalized.
- Any product creates a local user automatically without explicit user action.
