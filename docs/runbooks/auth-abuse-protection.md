# Auth Abuse Protection Runbook

Status: implementation contract for nof-mp web auth throttling and audit events.

## Thresholds

| Surface | Key | Threshold | Window | Public response |
|---|---|---:|---:|---|
| Login | IP + submitted login identifier | 10 attempts | 15 minutes | Redirect to the normal failed login flow |
| Login captcha gate | IP + submitted login identifier | after 3 failed upstream login attempts | 15 minutes | Redirect to the normal failed login flow until a valid captcha token is submitted |
| Registration request | IP | 5 attempts | 1 hour | `429` with retry-after |
| Registration request | Email hash | 3 attempts | 24 hours | `429` with retry-after |
| Password reset request | IP + email hash | 5 attempts | 1 hour | Uniform success message |
| Password reset confirm | IP | 20 attempts | 1 hour | `429` JSON error |

## SmartCaptcha Contract

`nof-mp` uses Yandex SmartCaptcha on public account entry points:

- visible captcha on registration requests;
- visible captcha on password reset link requests;
- invisible captcha on login after three failed upstream login attempts for the same IP and login identifier.

Runtime variables:

- `NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY`: public browser key for the widget.
- `YANDEX_CAPTCHA_SERVER_KEY`: server-side validation key. Secret value; never print or commit it.
- `CAPTCHA_DISABLED`: local/dev bypass flag. Production must not use this bypass when captcha enforcement is expected.

Local tests may use `YANDEX_CAPTCHA_SERVER_KEY=test-server-key` and `mock-smartcaptcha-token`. Real production keys are provisioned outside the repository and are not required for local build/test.

## Audit Events

Auth audit events must never contain passwords, registration codes, raw reset tokens, reset URLs, SMTP credentials, or full reset-request email addresses.

Expected event families:

- `login_*`
- `registration_*`
- `password_reset_*`
- `password_change_*`

Password reset request events use a SHA-256 email hash prefix as `loginIdentifier`; this supports investigation without exposing the submitted email in logs or UI.

## Stop Conditions

- If a throttle blocks legitimate owner UAT, record the exact surface and timestamp, then tune thresholds in code with tests.
- If a production incident requires higher limits or temporary disablement, create a tracked hotfix task first unless the owner explicitly approves an emergency action.
- Do not mutate hbl/prod runtime settings from the nof-mp agent directly.
