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
