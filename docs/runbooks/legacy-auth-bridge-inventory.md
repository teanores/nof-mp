# Legacy Auth Bridge Inventory

Status: draft
Date: 2026-06-08
Project: NOF Main Platform / `nof-mp`

## Purpose

This inventory separates current legacy bridge code from accidental naming debt. It is safe to keep a legacy name only when it describes a live boundary to the old platform backend and is documented as temporary.

## Current Live Bridge

NOF MP still authenticates through the legacy backend while platform identity is being consolidated. The following names describe that active compatibility boundary:

| Area | Current name | Why it remains for now |
| --- | --- | --- |
| Auth cookie/JWT decoding | `dragon-forge-auth` | Decodes legacy `auth_token` until nof-mp owns the full platform session issuer. |
| Internal login proxy | `dragon-forge-login` | Calls the legacy internal login endpoint from a server-side route. |
| Public registration proxy | `public-registration` with `DRAGON_FORGE_INTERNAL_URL` | Proxies registration to the legacy backend until registration is migrated into nof-mp. |

These names are not product names and must not appear in owner-facing UI.

## Target Direction

After the platform identity migration, replace legacy bridge names with platform-owned names such as:

- `platform-session-auth`;
- `platform-login-service`;
- `platform-registration-service`.

Do not rename these modules mechanically before the auth boundary changes. A safe rename needs tests around login, logout, profile, admin access, OAuth consent and product launch flows.

## Related Debt

- MCP token schema ownership still needs an architecture decision before moving away from `forge_tasks` fallback.
- Security audit event ownership still needs an architecture decision before moving dashboard storage out of `forge_tasks.security_audit_event`.
- Historical rollback evidence may keep old names, but new runtime defaults and UI copy must use current NOF naming.

## Stop Conditions

Stop before implementation if:

- a change would alter auth cookie names, JWT verification, login URLs or registration behavior without tests;
- a DB/schema rename lacks migration and rollback;
- evidence requires printing secret values;
- owner-facing UI would expose `dragon-forge`, `forge_tasks`, internal IPs or NodePorts.
