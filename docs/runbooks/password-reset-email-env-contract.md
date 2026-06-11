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

`NOF_MP_EMAIL_FROM`

- Owner: email delivery boundary.
- Purpose: sender address used in password reset emails.
- Required for: explicit sender identity. If empty, the SMTP user may be used as fallback.
- Security: not usually a secret, but do not paste private mailbox details into public evidence unless approved.

`SMTP_HOST`

- Owner: email delivery boundary.
- Purpose: SMTP provider hostname for Phase 1 Google/Gmail delivery.
- Required for: real email delivery from the internal email endpoint.
- Security: not a secret, but keep environment-specific values in runtime config/evidence only.

`SMTP_PORT`

- Owner: email delivery boundary.
- Purpose: SMTP provider port. Phase 1 uses STARTTLS port `587` unless provider config says otherwise.
- Required for: real email delivery from the internal email endpoint.
- Security: not a secret.

`SMTP_USER`

- Owner: email delivery boundary.
- Purpose: SMTP account username.
- Required for: provider authentication.
- Security: treat as sensitive operational data; do not print in chat, Wiki, tracker or logs.

`SMTP_PASS`

- Owner: email delivery boundary.
- Purpose: SMTP app password/token.
- Required for: provider authentication.
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
- Phase 1 uses current Google/Gmail SMTP only behind the internal boundary.
- Do not self-host SMTP for Phase 1; own NOF mail infrastructure is a future development track.

## Current Phase 1 Architecture

```text
/api/public/password-reset/request
  -> PasswordResetDelivery
  -> NOF_MP_EMAIL_WEBHOOK_URL
  -> /api/internal/email/password-reset
  -> current Google/Gmail SMTP
```

The public password reset route stays non-enumerating. SMTP provider details stay behind a replaceable boundary, so a future `nof-mail` service or NOF-owned mail server can replace the implementation without changing the public password reset flow.

## Local Testing

Use fake/mocked `fetch` in unit tests. Do not call a real provider from local automated tests.

## Production Gate

Before production email delivery is enabled:

1. Create `NOF_MP_EMAIL_WEBHOOK_URL` and `NOF_MP_EMAIL_WEBHOOK_TOKEN` in the production secret/config store without printing values.
2. If using the built-in nof-mp boundary, set `NOF_MP_EMAIL_WEBHOOK_URL` to the internal service URL for `/api/internal/email/password-reset`.
3. Configure `NOF_MP_EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS` in runtime secret/config storage without printing values.
4. Confirm the webhook endpoint is internal or protected.
5. Run local tests and release preflight.
6. Deploy nof-mp.
7. Owner UAT: request reset for a real email, receive link, set new password, log in with the new password.

## hbl Secret Setup

Production-changing hbl commands require explicit owner approval in the current conversation.

Use this pattern on hbl only after approval. It avoids printing secret values:

```bash
ssh nofadminhbl@192.168.1.51

read -rsp "NOF_MP_EMAIL_WEBHOOK_TOKEN: " NOF_MP_EMAIL_WEBHOOK_TOKEN; echo
read -rp  "NOF_MP_EMAIL_FROM: " NOF_MP_EMAIL_FROM
read -rp  "SMTP_HOST: " SMTP_HOST
read -rp  "SMTP_PORT: " SMTP_PORT
read -rp  "SMTP_USER: " SMTP_USER
read -rsp "SMTP_PASS: " SMTP_PASS; echo

sudo microk8s kubectl create secret generic nof-mp-email-secrets \
  -n nof-apps \
  --from-literal=NOF_MP_EMAIL_WEBHOOK_TOKEN="$NOF_MP_EMAIL_WEBHOOK_TOKEN" \
  --from-literal=NOF_MP_EMAIL_FROM="$NOF_MP_EMAIL_FROM" \
  --from-literal=SMTP_HOST="$SMTP_HOST" \
  --from-literal=SMTP_PORT="$SMTP_PORT" \
  --from-literal=SMTP_USER="$SMTP_USER" \
  --from-literal=SMTP_PASS="$SMTP_PASS" \
  --dry-run=client -o yaml | sudo microk8s kubectl apply -f -

unset NOF_MP_EMAIL_WEBHOOK_TOKEN NOF_MP_EMAIL_FROM SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS
```

Verify by key names and encoded lengths only:

```bash
sudo microk8s kubectl get secret nof-mp-email-secrets -n nof-apps \
  -o go-template='{{range $k,$v := .data}}{{printf "%s length=%d\n" $k (len $v)}}{{end}}'
```

Expected keys:

- `NOF_MP_EMAIL_WEBHOOK_TOKEN`
- `NOF_MP_EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Do not decode or paste the values.
