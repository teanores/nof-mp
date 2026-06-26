# Security Audit Schema Ownership

Task: `MANUAL-593766A9`.

## Decision

NOF MP owns platform auth, session, profile and edge security-audit events.
The canonical storage is:

- schema: `nof_platform`
- table: `security_audit_event`

Task Tracker audit events remain owned by `nof-tt`. NOF MP must not read the
tracker database schema for platform security dashboard data.

## Runtime Contract

Default runtime behavior writes and reads `nof_platform.security_audit_event`.

`NOF_PLATFORM_SECURITY_AUDIT_DB_SCHEMA` is allowed only as a deployment-time
cutover override. It must point to a platform-owned schema. It must not point to
`forge_tasks` or any tracker-owned schema.

## Cutover Plan

1. Apply the platform-owned table migration in a local or staged PostgreSQL
   environment first.
2. Deploy code that defaults to `nof_platform.security_audit_event`.
3. Verify login, logout, session-expired, admin-user and edge-ingestion events
   are visible in `/admin/security` and `/admin/events`.
4. Keep old tracker audit data read-only for historical inspection outside
   NOF MP until retention expires.

## Rollback

Rollback code to the previous release if the platform dashboard cannot read the
new table after migration. Do not point NOF MP back at tracker-owned schemas as
the normal rollback path; doing so reintroduces cross-service ownership debt.

## Stop Conditions

- No production migration without explicit owner approval.
- No direct tracker schema reads from NOF MP.
- No secret values, raw tokens, passwords or private keys in audit rows or
  evidence.
