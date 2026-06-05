# NOF MP

`nof-mp` owns the central Narag'Othal Forgath portal surface: login, registration, user profile, personal settings, global MCP token issue UI, product discovery, platform OAuth and future subscription/access management.

## Ownership Boundary

Owns:

- Platform landing and overview pages.
- Login, logout, registration and profile.
- User language/theme preferences.
- Global MCP-token issue/revoke UI in the user profile.
- Future subscriptions, product catalog, access management and account security.

Does not own:

- Product tracker boards, product wiki pages and product MCP methods owned by `nof-tt`.
- Habit Tracker domain logic owned by `habit-tracker` / future `nof-ht`.
- Coffee portal domain logic owned by `nof-cb`.

## Layout

```text
apps/web/        Next.js platform portal and account UI
packages/        Future shared contracts and SDKs
docs/            Platform architecture, runbooks and decisions
```

## Checks

```powershell
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```
