# NOF Platform Boundary

`nof-mp` is the central account and portal product. Other products integrate with it for identity and access instead of copying login/profile code.

## Platform Responsibilities

- Authenticate users through the platform account and approved first-party NOF identity flows.
- Register users and verify email codes.
- Render the global portal overview and route users to available products.
- Render the user profile and personal settings.
- Issue, rotate and revoke MCP tokens scoped to projects/products.
- Become the future home of subscription and entitlement rules.

## Auth Compliance Boundary

- NOF MP does not expose Telegram, foreign social networks, or external email providers as standalone login or registration methods.
- Telegram may be used only as a post-login notification, community, or account-linking channel after the user has authenticated through an approved NOF account flow.
- Cross-service authorization uses first-party NOF OAuth between NOF services.
- New external identity providers require an explicit legal/compliance decision before implementation.

## Product Integration Contract

- Products redirect unauthenticated users to the platform login.
- Products receive a platform-provided session/access context from the gateway/platform layer.
- Products do not read platform user tables directly.
- Product-owned MCP methods remain inside the product service.

## Current Migration Note

This initial repository skeleton is extracted from the hybrid portal code. It is the platform owner of these files, not a bridge inside a product repository.
