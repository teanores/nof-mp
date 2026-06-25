# AGENTS.md - NOF MP

Read this file first when an agent starts inside this repository.

## Project Identity

Canonical repository name: `nof-mp`.

Product identity: NOF Main Platform, project key `nof-mp`.

This repository owns the NOF Main Platform service. The old `nof-platform` name is migration debt and may appear only in rollback, historical release evidence or rename runbooks.

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

- Task Tracker boards, Wiki, tasks, sprints or tracker MCP methods, owned by `nof-tt`;
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
- Existing MCP/tracker legacy ids may appear only as migration evidence. New nof-mp sprint keys must use `NOF-MP-SPRINT-*`; new nof-mp epics must use `NOF-MP-EPIC-*`; nof-mp work must not be planned under `NOFTT-SPRINT-*`.
- Work on task branches; do not implement directly on `main`.
- Record branch, commit, checks, smoke/UAT evidence and rollback notes for release-bound work.
- P0/P1 technical debt blocks stable release unless closed or explicitly accepted as HOLD by the owner.

## Deploy Boundary

Agents do not deploy by default.

This repository must not store, print or use an SSH key to hbl for routine production deploys. NOF MP release execution belongs to `nof-infra`.

The approved routine path for owner-owned `nof-mp` releases is:

1. nof-mp prepares code, tests, semver tag and GitHub Release;
2. the service-local GitHub Release workflow requests `nof-infra` `.github/workflows/release-builder.yml` through `workflow_dispatch` with fixed `service=nof-mp`, the published semver tag, `approval_id` derived from the release, and `execute_deploy=true`;
3. `nof-infra` validates and runs the deploy on the infra-owned hbl runner through release-builder;
4. nof-mp reads the nof-infra/release-builder evidence, performs public smoke and asks the owner for UAT.

The service-local release workflow is only a request bridge. It must not SSH to hbl, run Helm/Kubernetes commands, or duplicate nof-infra release-builder logic.

Manual `nof-infra` workflow_dispatch remains available for supervised releases, rollback and emergencies.

Direct SSH/manual release-builder execution from a nof-mp session is a break-glass exception only for an explicitly approved incident or automation outage. If used, it must be named `manual release-builder` in chat/tracker evidence and followed by a nof-infra hardening task. It is not the normal deploy path.

The current hardening release runbook is stored in tracker Wiki:

- `nof-mp-hardening-release-runbook-2026-06-04`

The target scoped release-builder service is `nof-mp`. If production still uses legacy `nof-platform`, treat that as migration debt and follow the rename runbook.

## Secret Rules

- Never print, copy, summarize or commit secret values.
- Do not open `.env`, token, private key, kubeconfig or credential files unless the owner explicitly authorizes a metadata-only inventory step.
- Secret inventories may record only names, locations, owners, purpose, consumers and rotation status.
- Never log passwords, tokens, private keys, DB URLs, Telegram tokens, SMTP passwords, MCP tokens, GitHub tokens or Kubernetes secret values.

## Quality Notes

- Auth and registration pages must not reveal internal architecture, old service names, private routes, secret names with values, internal IPs or NodePorts.
- Platform pages must not show the old Forge Tasks marker `NOF.TT // v0.1.8`.
- Footer/version marker must come from the shared platform version source, not duplicated strings.
- Footer shape is a stable platform UI contract: left side is the shared `NOF.MP // vX.Y.Z` marker, right side is `Narag'Othal Forgath`. Do not change footer layout, copy, casing, placement or version source in feature/ops tasks unless the owner explicitly approves a shell/footer task.
- Authenticated overview/profile navigation uses the compact avatar/initials profile affordance, not a text button. Text profile/login actions are allowed only on explicit login-required states and must not appear on authenticated overview.
- Do not add explanatory sidebars, bottom help panels, tours, onboarding text or process/runbook copy to user-facing or admin UI without explicit owner-approved copy. Working pages should prioritize controls, data and clear states; help/tour content is a separate agreed feature.
