# Password Rotation Policy Runbook

Status: implementation contract for explicit password rotation enforcement in nof-mp.

## Scope

`nof-mp` does not infer password weakness from password hashes. Legacy weak/default/temporary-password handling is explicit:

- mark a user in `nof_platform.password_policy_state`;
- set `must_rotate_password=true`;
- store a non-secret reason such as `legacy_weak_password`;
- never print email addresses, password hashes, raw passwords or reset tokens in evidence.
- administrators may mark a selected user for rotation from the platform user card; the action records an audit event and stores only an allowlisted non-secret reason.

## Runtime Behavior

- On successful login, nof-mp checks `password_policy_state`.
- Users with `must_rotate_password=true` are redirected to `/profile?password=rotation-required`.
- Successful authenticated password change clears the rotation requirement.
- Successful password reset confirmation clears the rotation requirement.

## Related Work

- `NOF-MP-30`: administrator denylist/removal workflow for suspicious, bot, spam or test accounts.
- `NOF-MP-31`: Telegram-only users email verification and account linking flow.

These are separate from password rotation. Banning/deleting a suspicious account must not be modeled as a password-rotation flag.

## Rollback And Stop Conditions

- If legitimate users are incorrectly forced to rotate, clear `must_rotate_password` for affected user ids through an approved admin/migration path and record aggregate counts only.
- If login redirect loops are observed, disable the enforcement commit before marking more users.
- Do not run production DB updates from the nof-mp agent directly; production mutations require owner approval and the nof-infra release/ops path.
