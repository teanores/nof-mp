# NOF-MP-35 User Reconciliation Inventory

## Scope

`nof-mp` owns the platform identity inventory for July beta cleanup. The inventory is read-only and is used by administrators to decide which platform users need manual cleanup before cross-service account alignment.

## Read Model

The nof-mp admin users page may classify platform users by:

- real email readiness;
- Telegram placeholder or service email;
- password-login versus Telegram-only account state;
- explicit access denied state;
- account merge or dev admin candidate state;
- nof-ht matching readiness when a platform user has a Telegram id plus either a real email or a service email placeholder.

The UI and tests must not expose passwords, password hashes, tokens, secrets, SMTP values, bot credentials, Kubernetes secret values, or MCP tokens.

## nof-ht Boundary

NOF-MP-35 does not mutate nof-ht users and does not write to any nof-ht database or API. The matching contract is evidence-only:

1. Prefer canonical platform user id when a service link exists.
2. Use verified real email as the next matching key.
3. Use Telegram id as a manual review key for Telegram-origin users.
4. Treat placeholder email domains as service placeholders, not real email proof.

Actual nof-ht account changes require a separate nof-ht-owned task or a future identity reconciliation gateway.

## Merge Boundary

The old admin action that treated one user as a source and another user as a target is disabled. That action is not the target
architecture because a real person may legitimately own several aliases: more than one email address, Telegram identity, and
service-local accounts.

Before any production merge or claim operation is enabled, the implementation must provide:

- a canonical person record;
- an alias table for email, Telegram id, Telegram username and service account ids;
- reversible audit records for every claim/link/unlink action;
- local Docker-Postgres migration evidence;
- owner-approved UAT scenarios for administrator-initiated and user-initiated linking.

## Target Model

The target model is canonical person plus append-only identity aliases.

Minimum records:

- `nof_platform.canonical_person`: one stable person id, lifecycle status, created/updated audit metadata;
- `nof_platform.identity_alias`: one row per claim such as email, Telegram id, Telegram username, platform user id, nof-ht user id or nof-tt user id;
- `nof_platform.identity_alias_event`: immutable audit trail for claim, verify, link, unlink, supersede and deny decisions;
- `nof_platform.person_account_link`: migration bridge between the canonical person and existing `dragon_forge."user"` rows while legacy tables still exist.

Invariants:

- one real person may own multiple verified emails;
- one real person may own multiple messenger identities across Telegram, MAX, Discord, VK or future messengers;
- synthetic Telegram placeholder email is never a real email alias;
- adding an alias must not overwrite another alias;
- source accounts are not deleted or denied merely because they were linked;
- account denial remains a separate access-control decision, not a merge side effect;
- nof-mp owns the canonical person and alias registry;
- nof-ht and nof-tt keep service-local users and consume platform identity through OIDC/service links;
- cross-service reconciliation is evidence-first and must not mutate nof-ht or nof-tt directly from nof-mp.

The first implementation step after this runbook is a local-only migration draft and repository tests. Production data migration
requires explicit owner approval after local Docker-Postgres evidence.

## Telegram Placeholder Email Rule

Telegram-origin users may have a synthetic placeholder in the platform email column. These values are not user mailboxes and must not be treated as recoverable email:

- `123456@telegram.forgath.ru`
- `123456@telegram.example.com`
- legacy malformed values such as `123456telegram.forgath.ru`
- legacy generated values such as `user123456forgath.ru` and `user123456@forgath.ru`

The admin flow should guide these users toward linking a real email to the same canonical platform account instead of creating another account or sending password reset mail to the placeholder.

Telegram identity fields must stay separated:

- `telegram_id` is numeric only;
- `telegram_username` is the username without a leading `@`;
- UI may display `@username`, but storage and admin-safe models must not mix username text into the Telegram ID field.
