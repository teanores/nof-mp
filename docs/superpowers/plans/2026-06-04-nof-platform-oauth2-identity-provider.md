# NOF Platform OAuth2 Identity Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad hoc product launch/session bridges with an explicit NOF Platform identity provider flow for product services.

**Architecture:** NOF MP owns the identity provider endpoints and product client registry. Product services redirect users to NOF MP authorization, then exchange a short-lived authorization code server-side and decide whether to link or register a local product account with explicit user consent.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL, Vitest, NOF MCP tracker.

---

## Current Guardrail

Habit Tracker direct launch remains closed in NOF MP until this standard exists. Do not add hidden product launch routes for `nof-ht` as a shortcut.

## Files

- Create: `apps/web/lib/server/oauth-client-registry.ts`
- Create: `apps/web/lib/server/oauth-authorization-code-repository.ts`
- Create: `apps/web/lib/server/oauth-consent-challenge-repository.ts`
- Create: `apps/web/lib/server/oauth-client-auth.ts`
- Create: `apps/web/lib/server/oauth-token-signer.ts`
- Create: `apps/web/app/oauth/authorize/route.ts`
- Create: `apps/web/app/oauth/token/route.ts`
- Create: `apps/web/app/oauth/consent/page.tsx`
- Create: `apps/web/app/oauth/consent/approve/route.ts`
- Create: `apps/web/tests/oauth-client-registry.test.ts`
- Create: `apps/web/tests/oauth-authorize-route.test.ts`
- Create: `apps/web/tests/oauth-token-route.test.ts`
- Create: `apps/web/tests/oauth-token-signer.test.ts`
- Create: `apps/web/tests/oauth-consent-challenge-repository.test.ts`
- Create: `apps/web/tests/oauth-consent-page.test.tsx`
- Create: `apps/web/tests/oauth-consent-approve-route.test.ts`
- Modify: `apps/web/lib/server/portal-auth-gate.ts`
- Modify: `apps/web/app/services/habit-tracker/page.tsx` only after the standard is ready

## Task 1: Client Registry

- [x] Create `oauth-client-registry.ts` with static first registry entries for `nof-tt` and `nof-ht`.
- [x] Each client must have `clientId`, `productKey`, `displayName`, `redirectUris`, and allowed `scopes`.
- [x] Write tests proving unknown clients fail and redirect URIs must match exactly.
- [x] Run `npm --workspace apps/web run test:run -- tests/oauth-client-registry.test.ts`.

## Task 2: Authorization Code Store

- [x] Create a repository that issues `oauth_code_*` codes with TTL, single-use state, nonce, client id, redirect URI, platform user id and requested scopes.
- [x] Use PostgreSQL for production path and an in-memory implementation only where existing tests need it.
- [x] Write tests for expiry, replay, client mismatch and redirect URI mismatch.
- [x] Run `npm --workspace apps/web run test:run -- tests/oauth-authorization-code-repository.test.ts`.

## Task 3: Authorization Endpoint

- [x] Implement `GET /oauth/authorize`.
- [x] Validate `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, and `nonce`.
- [x] Require platform session; guests redirect to `/login?next=...`.
- [x] If consent/linking is required, redirect to `/oauth/consent`.
- [x] On approval, redirect to the product `redirect_uri` with `code` and original `state`.
- [x] Tests must cover invalid redirect, guest redirect, success, and state preservation.

## Task 4: Token Endpoint

- [x] Implement preliminary `POST /oauth/token`.
- [x] Accept authorization code exchange only through the validated authorization-code repository.
- [x] Add production client authentication or approved internal auth mechanism before external exposure.
- [x] Return signed token format.
- [x] Limit email-related claims to granted `email` scope.
- [ ] Enrich claims with verified email when available.
- [x] Do not return passwords, raw cookies, internal roles outside agreed scopes, or secrets.
- [x] Tests must cover success, replay, expired code, bad client, bad redirect URI and missing code.

## Task 5: Product UX Contract

- [x] Implement `/oauth/consent` page that shows the product, requested scopes, current platform user and explicit approve/deny actions.
- [x] Bind OAuth consent approval to a server-side challenge so the browser cannot forge OAuth request fields.
- [x] Document product-side required behavior in Wiki: linked account check, account switch, registration/linking consent and no silent synthetic users.
- [ ] Update nof-tt and nof-ht MCP tasks after the ADR is frozen.
- [ ] Only then update `services/habit-tracker` CTA from closed state to a standard OAuth launch entry.

## Verification

- [x] `npm --workspace apps/web run test:run`
- [x] `npm --workspace apps/web run build`
- [x] `npm --workspace apps/web run typecheck`
- [x] `npm --workspace apps/web run lint`
- [x] `npm audit --workspace apps/web`
- [x] `git diff --check`

## Stop Conditions

- Any implementation would expose client secrets or platform tokens to browser JavaScript.
- Any product would create a local user silently without explicit user action.
- Any test requires production services or production secrets.
- Any route can continue with a stale product session for another user.
