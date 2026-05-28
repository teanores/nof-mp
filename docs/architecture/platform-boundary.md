# NOF Platform Boundary

`nof-platform` is the central account and portal product. Other products integrate with it for identity and access instead of copying login/profile code.

## Platform Responsibilities

- Authenticate users through current Dragon Forge credentials and future OAuth providers.
- Register users and verify email codes.
- Render the global portal overview and route users to available products.
- Render the user profile and personal settings.
- Issue, rotate and revoke MCP tokens scoped to projects/products.
- Become the future home of subscription and entitlement rules.

## Product Integration Contract

- Products redirect unauthenticated users to the platform login.
- Products receive a platform-provided session/access context from the gateway/platform layer.
- Products do not read platform user tables directly.
- Product-owned MCP methods remain inside the product service.

## Current Migration Note

This initial repository skeleton is extracted from the hybrid portal code. It is the platform owner of these files, not a bridge inside a product repository.
