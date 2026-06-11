# Local identity test runner

This runbook is the first local, non-production identity regression runner for NOF-MP.

## Purpose

Use it before NOF-MP identity, OAuth, login, profile, password or service-link releases.
It does not contact production and does not require hbl access.

## Command

Run from `C:\Users\User\Documents\dev\NOF\nof-mp`:

```powershell
npm run test:identity
```

The same command is available through Just:

```powershell
just test-identity
```

## Local identity fixtures

Start a reproducible Docker PostgreSQL instance:

```powershell
just db-up
```

Print a safe local-only environment template:

```powershell
npm run local:identity-env
```

Show deterministic local test users:

```powershell
npm run local:identity-users
```

Prepare local PostgreSQL role/database once, using a local admin connection string:

```powershell
$env:NOF_LOCAL_POSTGRES_ADMIN_URL="postgresql://postgres:<local-admin-password>@localhost:5432/postgres"
npm run local:bootstrap-db
```

This is only needed for an already installed local PostgreSQL. The Docker path does not need it.

Seed a dedicated local database:

```powershell
just seed-identity
```

Reset and reseed the same local users:

```powershell
just reset-identity
```

The seed script refuses non-local database hosts and database names without a `local` or `test` marker.

Run the current local identity readiness bundle:

```powershell
just local-ready
```

Run browser smoke for the current profile/password/service-link surface:

```powershell
just smoke-identity
```

The smoke uses local Docker PostgreSQL, fake users and a local Next.js server on `127.0.0.1:3300`.
It does not call production domains; Habit Tracker link status is expected to be unavailable until the multi-service harness is added.

Stop the Docker database:

```powershell
just db-down
```

## Covered scenarios

- platform auth cookie decoding;
- platform login proxy behavior and audit sanitization;
- OAuth authorize, consent approval and token route contracts;
- product launch route contract;
- profile service-link read/unlink contract;
- platform password hash compatibility, policy, repository and profile API;
- profile UI for current user, linked services, MCP keys and password change.

## Not covered yet

- real browser end-to-end across `forgath.ru`, `task-tracker.forgath.ru` and `habit-tracker.forgath.ru`;
- live PostgreSQL data migrations;
- hbl release-builder deployment;
- cross-service new-user registration in nof-ht.

Those remain separate follow-up tasks because they need a local multi-service harness or explicit production/UAT approval.
