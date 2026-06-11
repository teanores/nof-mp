# Password Reset Email Environment Contract

Status: draft implementation contract for NOF-MP password reset delivery.

This file documents variable names and behavior only. Do not store real secret values here.

## Variables

`NOF_MP_EMAIL_WEBHOOK_URL`

- Owner: `nof-mp`.
- Purpose: internal server-side endpoint that accepts email delivery requests.
- Used by: `apps/web/lib/server/password-reset-delivery.ts`.
- Required for: sending real password reset emails.
- Empty behavior: password reset request still returns a safe non-enumerating success response, but no email is sent.
- Security: must be a server-side env var only; do not expose in browser code.

`NOF_MP_EMAIL_WEBHOOK_TOKEN`

- Owner: `nof-mp`.
- Purpose: bearer token used by nof-mp when calling `NOF_MP_EMAIL_WEBHOOK_URL`.
- Used by: `apps/web/lib/server/password-reset-delivery.ts`.
- Required for: sending real password reset emails.
- Security: secret value; never print, commit, paste into tracker/Wiki/chat, or expose to browser code.

`NEXT_PUBLIC_PLATFORM_ORIGIN`

- Owner: `nof-mp`.
- Purpose: public origin used to build password reset links.
- Production expected value: `https://forgath.ru`.
- Security: not a secret, but must not point to LAN/internal hosts in production.

## Webhook Request

When configured, nof-mp sends:

```json
{
  "kind": "password_reset",
  "to": "user@example.com",
  "userId": "platform-user-id",
  "resetUrl": "https://forgath.ru/password-reset?token=...",
  "expiresAt": "2026-06-11T11:00:00.000Z"
}
```

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer <NOF_MP_EMAIL_WEBHOOK_TOKEN>`

## Safety Rules

- Store only SHA-256 reset token hashes in nof-mp database.
- The raw token may appear only in the generated reset URL passed to the email delivery boundary.
- Do not log the raw token or reset URL.
- Public reset request response must be uniform for existing, missing and unresettable accounts.
- Synthetic placeholder emails such as `*@telegram.forgath.ru` must not receive reset links.

## Local Testing

Use fake/mocked `fetch` in unit tests. Do not call a real provider from local automated tests.

## Production Gate

Before production email delivery is enabled:

1. Create `NOF_MP_EMAIL_WEBHOOK_URL` and `NOF_MP_EMAIL_WEBHOOK_TOKEN` in the production secret/config store without printing values.
2. Confirm the webhook endpoint is internal or protected.
3. Run local tests and release preflight.
4. Deploy nof-mp.
5. Owner UAT: request reset for a real email, receive link, set new password, log in with the new password.
