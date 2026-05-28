# Platform Data And Access Contract

## Goal

Define the first honest platform-owned data model and access contract so product services do not copy login, profile, preference or MCP-token logic.

## Ownership

`nof-platform` owns identity, profile, global preferences, product registry, product access decisions and MCP-token issuance.

Product repositories such as `nof-tt` own their domain data and receive a platform-provided session/access context.

## First Tables

| Table | Purpose | Sensitive |
|---|---|---|
| `nof_platform.users` | Canonical platform account identity and profile linkage to existing Dragon Forge users during migration | No |
| `nof_platform.sessions` | Server-side session records or signed session metadata for platform login and product handoff | Yes |
| `nof_platform.user_preferences` | Per-user language, theme and future personal portal settings | No |
| `nof_platform.products` | Product registry: task tracker, habit tracker, coffee portal, learning portal and future tools | No |
| `nof_platform.product_access` | Product visibility and per-user access rules | No |
| `nof_platform.mcp_tokens` | Hashed MCP tokens issued from platform profile and scoped to products/projects | Yes |

## Product Visibility Model

| Visibility | Meaning |
|---|---|
| `public` | Visible to guests |
| `registered` | Requires any authenticated platform user |
| `invited` | Requires explicit user invitation or platform staff role |
| `owners` | Requires product owner membership or platform staff role |

Platform staff roles are `owner`, `admin` and `moderator`.

## Access Decision Contract

Products should receive a decision with:

- `allowed: boolean`;
- `reason`: stable machine-readable reason;
- product key;
- user id and role when authenticated.

Current typed source: `apps/web/lib/platform-access-contract.ts`.

## Migration Notes

- Existing Dragon Forge user data remains the migration source until the platform schema is fully backed by its own tables.
- MCP token secret values are never stored; only hashes and non-secret prefixes are stored.
- Product services must not read platform user/session tables directly. They should use a gateway/header/token introspection contract.

## Next Step

Add an internal introspection endpoint or signed handoff token after the table migration is selected.
