# AGENTS.md - NOF Main Platform

Read this file first when an agent starts inside this repository.

## Project Identity

Current repository name: `nof-platform`.

Product identity: NOF Main Platform, project key `nof-mp`.

This repository is the current local and GitHub source for the future `nof-mp` service name. Until the rename is complete, use `nof-platform / future nof-mp` in release notes and architecture discussions when ambiguity matters.

## Ownership Boundary

This repository owns:

- platform login, logout and registration surfaces;
- platform profile and preferences;
- platform overview and service discovery pages;
- platform-owned MCP token management UI;
- product launch/access shell;
- NOF MP footer/version marker;
- public platform metadata routes such as `/robots.txt` and `/sitemap.xml`.

This repository does not own:

- Forge Tasks tracker boards, Wiki, tasks, sprints or tracker MCP methods, owned by `nof-tt`;
- Habit Tracker domain logic, owned by `nof-ht`;
- legacy Python/FastAPI backend and Telegram bot code, owned by legacy `nof-service`;
- Helm/release-builder canonical infrastructure, intended for `nof-infra`;
- streamer/gamification/bot-management future services unless explicitly moved here by owner decision.

## Local Layout

```text
apps/web/        Next.js platform portal and account UI
packages/        Shared packages when needed
docs/            Service-local architecture, runbooks and decisions
```

## Commands

Run from repository root:

```powershell
npm install
npm run test -- --run
npm run build
npm run typecheck
npm run lint
git diff --check
```

For release-bound work, run the full set above and record results in the tracker/Wiki.

## Delivery Rules

- Use owner-facing project names with separated prefixes, for example `NOF-MP Sprint 3`.
- Existing MCP/tracker internal ids such as `NOFMP-*`, `NOFTT-SPRINT-*` and `MANUAL-*` may remain until tracker key migration is implemented.
- Work on task branches; do not implement directly on `main`.
- Record branch, commit, checks, smoke/UAT evidence and rollback notes for release-bound work.
- P0/P1 technical debt blocks stable release unless closed or explicitly accepted as HOLD by the owner.

## Deploy Boundary

Agents do not deploy by default.

Controlled NOF MP deploy is allowed only when the owner explicitly asks in the current conversation and a runbook exists. The current hardening release runbook is stored in tracker Wiki:

- `nof-mp-hardening-release-runbook-2026-06-04`

The scoped release-builder service is `nof-platform`; do not use broad manifest sync when only NOF MP should deploy.

## Secret Rules

- Never print, copy, summarize or commit secret values.
- Do not open `.env`, token, private key, kubeconfig or credential files unless the owner explicitly authorizes a metadata-only inventory step.
- Secret inventories may record only names, locations, owners, purpose, consumers and rotation status.
- Never log passwords, tokens, private keys, DB URLs, Telegram tokens, SMTP passwords, MCP tokens, GitHub tokens or Kubernetes secret values.

## Quality Notes

- Auth and registration pages must not reveal internal architecture, old service names, private routes, secret names with values, internal IPs or NodePorts.
- Platform pages must not show the old Forge Tasks marker `NOF.TT // v0.1.8`.
- Footer/version marker must come from the shared platform version source, not duplicated strings.
