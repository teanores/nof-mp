# NOF-MP web UI control states

Status: accepted local standard for `NOF-MP-SPRINT-2`.

## Scope

This standard applies to primary action controls on `forgath.ru` account and admin surfaces:

- registration;
- password reset;
- profile password change;
- MCP token actions;
- admin account recovery actions.

## Rule

Disabled and pending primary actions must not look like active primary actions.

Use a real HTML `disabled` state when the action cannot be submitted. The disabled state must:

- keep the same size and layout as the enabled button;
- remove the accent fill;
- use muted border and text;
- avoid hover brightness;
- use `cursor-not-allowed` only as a secondary signal;
- rely on nearby validation/checklist state to explain why the action is unavailable.

Enabled primary actions keep the accent fill.

## Implementation

Use the shared helpers:

- `primaryActionClassName(isDisabled)`;
- `compactPrimaryActionClassName(isDisabled, extraClassName)`.

Do not inline new filled disabled primary button classes such as:

```text
bg-forge-accent ... disabled:opacity-60
```

## Verification

Representative tests must assert both behavior and visual contract:

- disabled button has `disabled`;
- disabled primary action does not have `bg-forge-accent`;
- enabled primary action has `bg-forge-accent`.

## Research baseline

- GOV.UK Design System warns that disabled buttons can confuse users and should be avoided where possible.
- MDN defines disabled HTML controls as non-mutable, non-focusable and not submitted with forms.
- WCAG 2.2 inactive UI components are exempt from some contrast requirements, but NOF keeps disabled controls visibly distinct and readable.
