# NOF MP Schema Ownership Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move platform-owned MCP token and security audit data away from accidental `forge_tasks` ownership without breaking live nof-tt MCP authentication or admin security visibility.

**Architecture:** Treat `nof_platform` as the target schema for platform-owned data. Keep nof-tt as the owner of Task Tracker domain data and MCP service methods. Use explicit compatibility phases: inventory, dual-read/write or read-only view, cutover, cleanup.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL, Vitest, nof-tt MCP, nof-infra release-builder.

---

## Current Findings

`nof-mp` already documents `nof_platform.mcp_tokens` as platform-owned in `docs/architecture/platform-data-and-access-contract.md`, but runtime code still defaults MCP token storage to `forge_tasks`:

- `apps/web/lib/server/mcp-token-repository.ts`
- `apps/web/tests/mcp-token-repository.test.ts`

`nof-mp` admin security dashboard also reads Task Tracker legacy storage directly:

- `apps/web/lib/server/security-audit-dashboard.ts`

`nof-tt` has its own MCP token repository and validates tokens from its tracker runtime schema:

- `nof-tt/apps/web/lib/server/mcp-token-repository.ts`

Legacy `nof-service` still writes security audit events to:

- `forge_tasks.security_audit_event`

This means a direct rename would break either token validation, historical audit visibility, or both.

## Target Decision

Recommended target:

- `nof-mp` owns platform-issued MCP token metadata in `nof_platform.mcp_tokens`.
- `nof-tt` owns MCP methods, tracker projects, Wiki, tasks, sprints, ideas and tracker-specific audit events.
- `nof-tt` must not become the owner of platform user/session tables.
- Platform-wide security audit events move to `nof_platform.security_audit_events`.
- Tracker/MCP-specific audit events remain nof-tt owned, then are exposed to nof-mp through a sanitized API or view if the admin dashboard needs cross-service visibility.

Open owner decision before implementation:

- Token validation contract: nof-tt reads `nof_platform.mcp_tokens` directly during the migration window, or nof-tt calls a nof-mp token introspection endpoint.

Direct DB read is simpler for the current local stack. Introspection endpoint is cleaner long-term but requires service-to-service auth and a new operational secret.

## Task 1: Lock Explicit Runtime Schema Names

**Files:**
- Modify: `nof-mp/.env.example`
- Modify: `nof-mp/docs/runbooks/oauth-identity-env-contract.md`
- Test: `nof-mp/apps/web/tests/mcp-token-repository.test.ts`

- [ ] **Step 1: Write the failing test for explicit default**

Change the first test in `apps/web/tests/mcp-token-repository.test.ts` so the platform fallback is no longer `forge_tasks`:

```ts
it("uses the platform schema by default for platform-issued MCP tokens", () => {
  expect(mcpTokenSchemaName()).toBe("nof_platform");
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
npm --workspace apps/web run test:run -- mcp-token-repository
```

Expected: the default schema test fails because runtime still returns `forge_tasks`.

- [ ] **Step 3: Change the default schema**

In `apps/web/lib/server/mcp-token-repository.ts`, replace:

```ts
return process.env.NOF_PLATFORM_MCP_DB_SCHEMA ?? process.env.NOF_PLATFORM_DB_SCHEMA ?? "forge_tasks";
```

with:

```ts
return process.env.NOF_PLATFORM_MCP_DB_SCHEMA ?? process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
```

- [ ] **Step 4: Preserve migration override coverage**

Keep the override test:

```ts
process.env.NOF_PLATFORM_MCP_DB_SCHEMA = "forge_tasks_preview";
expect(mcpTokenSchemaName()).toBe("forge_tasks_preview");
```

This proves rollback/compatibility can still be configured explicitly.

- [ ] **Step 5: Update env example**

In `.env.example`, add:

```text
NOF_PLATFORM_MCP_DB_SCHEMA=nof_platform
```

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npm --workspace apps/web run test:run -- mcp-token-repository platform-access-contract
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add .env.example apps/web/lib/server/mcp-token-repository.ts apps/web/tests/mcp-token-repository.test.ts docs/runbooks/oauth-identity-env-contract.md
git commit -m "chore: default platform mcp tokens to platform schema"
```

## Task 2: Add nof-tt Compatibility Contract

**Files:**
- Create: `nof-mp/docs/architecture/mcp-token-validation-contract.md`
- Modify: `nof-tt/docs/runbooks/platform-oauth-env-contract.md` or nearest nof-tt runbook if present
- Test: no runtime test in this task

- [ ] **Step 1: Document the migration contract**

Create `docs/architecture/mcp-token-validation-contract.md` in `nof-mp`:

```md
# MCP Token Validation Contract

Status: draft
Owner: nof-mp for token issuance, nof-tt for MCP method execution

nof-mp owns platform-issued MCP token metadata in `nof_platform.mcp_tokens`.
nof-tt owns the MCP service methods and validates project-scoped access.

Migration contract:

1. During migration, nof-tt may read `nof_platform.mcp_tokens` directly or call a nof-mp introspection endpoint.
2. Token secret values are never stored; only HMAC hashes and non-secret prefixes are stored.
3. Token prefixes stay project-scoped: `nof-tt`, `nof-mp`, `nof-ht`.
4. Existing tokens remain valid until a planned rotation or explicit owner-approved revocation.
5. Any schema switch requires local verification, hbl deploy approval, smoke and owner UAT.
```

- [ ] **Step 2: Mirror the contract reference in nof-tt docs**

Add a short reference in the relevant nof-tt runbook:

```md
MCP token validation must follow the nof-mp contract `docs/architecture/mcp-token-validation-contract.md`.
nof-tt owns MCP methods, not platform token issuance.
```

- [ ] **Step 3: Commit docs**

Run:

```powershell
git add docs/architecture/mcp-token-validation-contract.md
git commit -m "docs: define mcp token validation contract"
```

Use a separate nof-tt commit if nof-tt docs are updated.

## Task 3: Security Audit Ownership Decision

**Files:**
- Create: `nof-mp/docs/architecture/security-audit-ownership-adr.md`
- No runtime code change

- [ ] **Step 1: Create ADR**

Create `docs/architecture/security-audit-ownership-adr.md`:

```md
# ADR: Security Audit Ownership

Status: proposed
Date: 2026-06-08

## Context

NOF MP admin security currently reads `forge_tasks.security_audit_event`.
Legacy nof-service writes that table. This couples platform security UI to Task Tracker legacy storage.

## Decision

Platform-wide auth, session, profile and edge security events belong to `nof_platform.security_audit_events`.
Task Tracker/MCP domain events belong to nof-tt storage.
The platform admin dashboard may display nof-tt events only through a sanitized API or explicit read-only view.

## Consequences

- nof-mp stops depending on `forge_tasks.security_audit_event` as a default runtime source.
- legacy events remain readable during migration.
- no direct production schema rename happens without migration and rollback.
```

- [ ] **Step 2: Commit ADR**

Run:

```powershell
git add docs/architecture/security-audit-ownership-adr.md
git commit -m "docs: propose security audit ownership"
```

## Task 4: Implement Security Audit Compatibility Reader

**Files:**
- Modify: `nof-mp/apps/web/lib/server/security-audit-dashboard.ts`
- Create or modify: `nof-mp/apps/web/tests/security-audit-dashboard.test.ts`

- [ ] **Step 1: Add tests for configurable schema**

Add a repository construction test with a fake pool:

```ts
it("reads security audit events from nof_platform by default", async () => {
  const pool = new RecordingPool([]);
  const repository = new SecurityAuditDashboardRepository(pool as never);

  await repository.dashboard();

  expect(pool.queries[0].sql).toContain("FROM nof_platform.security_audit_events");
});
```

- [ ] **Step 2: Add tests for legacy override**

```ts
it("can read legacy forge_tasks audit events through an explicit schema override", async () => {
  process.env.NOF_PLATFORM_SECURITY_AUDIT_SCHEMA = "forge_tasks";
  const pool = new RecordingPool([]);
  const repository = new SecurityAuditDashboardRepository(pool as never);

  await repository.dashboard();

  expect(pool.queries[0].sql).toContain("FROM forge_tasks.security_audit_event");
});
```

- [ ] **Step 3: Implement schema/table selection**

Add helpers:

```ts
function securityAuditSchemaName(): string {
  return process.env.NOF_PLATFORM_SECURITY_AUDIT_SCHEMA ?? process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function securityAuditTableName(schema = securityAuditSchemaName()): string {
  return schema === "forge_tasks" ? `${schema}.security_audit_event` : `${schema}.security_audit_events`;
}
```

Use `securityAuditTableName()` in the dashboard query.

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm --workspace apps/web run test:run -- security-audit-dashboard admin-security-page
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/web/lib/server/security-audit-dashboard.ts apps/web/tests/security-audit-dashboard.test.ts
git commit -m "refactor: configure platform security audit source"
```

## Task 5: Full Gate And Release Notes

**Files:**
- Modify: `nof-mp/docs/runbooks/release-builder-safety.md`
- Update tracker tasks through nof-tt MCP

- [ ] **Step 1: Run full check**

Run:

```powershell
npm run check
```

Expected: lint, typecheck and all Vitest tests pass.

- [ ] **Step 2: Record release notes**

Add to `docs/runbooks/release-builder-safety.md`:

```md
Schema ownership migration notes:

- Platform MCP tokens target `nof_platform.mcp_tokens`.
- Platform security audit events target `nof_platform.security_audit_events`.
- Legacy `forge_tasks` sources require explicit env overrides during migration windows.
```

- [ ] **Step 3: Commit release notes**

Run:

```powershell
git add docs/runbooks/release-builder-safety.md
git commit -m "docs: record schema ownership release notes"
```

- [ ] **Step 4: Push branch**

Run:

```powershell
git push -u origin <branch-name>
```

## Owner UAT

No browser UAT is required for Tasks 1-3 because they are config/docs only.

Browser UAT is required after Task 4 is deployed:

1. Open `https://forgath.ru/admin/security` as admin.
2. Confirm the page is not white.
3. Confirm recent events are readable or the empty state is clear.
4. Confirm no `forge_tasks`, internal IP, NodePort or secret values are visible.
5. Confirm non-admin users cannot see admin cards or open admin pages.

## Stop Conditions

Stop if:

- nof-tt cannot validate existing MCP tokens after a local compatibility test;
- a migration would require printing token values or DB credentials;
- admin security loses visibility without an accepted empty-state fallback;
- hbl/prod changes are needed without explicit owner approval;
- owner has not chosen direct DB read vs token introspection for nof-tt validation.

