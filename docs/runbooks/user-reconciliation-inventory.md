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

## Telegram Placeholder Email Rule

Telegram-origin users may have a synthetic placeholder in the platform email column. These values are not user mailboxes and must not be treated as recoverable email:

- `123456@telegram.forgath.ru`
- `123456@telegram.example.com`
- legacy malformed values such as `123456telegram.forgath.ru`
- legacy generated values such as `user123456forgath.ru`

The admin flow should guide these users toward linking a real email to the same canonical platform account instead of creating another account or sending password reset mail to the placeholder.

Telegram identity fields must stay separated:

- `telegram_id` is numeric only;
- `telegram_username` is the username without a leading `@`;
- UI may display `@username`, but storage and admin-safe models must not mix username text into the Telegram ID field.
