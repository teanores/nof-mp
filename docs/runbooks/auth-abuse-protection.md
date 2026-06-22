# Auth Abuse Protection Runbook

Status: implementation contract for nof-mp web auth throttling and audit events.

## Thresholds

| Surface | Key | Threshold | Window | Public response |
|---|---|---:|---:|---|
| Login | IP + submitted login identifier | 10 attempts | 15 minutes | Redirect to the normal failed login flow |
| Registration request | IP | 5 attempts | 1 hour | `429` with retry-after |
| Registration request | Email hash | 3 attempts | 24 hours | `429` with retry-after |
| Password reset request | IP + email hash | 5 attempts | 1 hour | Uniform success message |
| Password reset confirm | IP | 20 attempts | 1 hour | `429` JSON error |

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
