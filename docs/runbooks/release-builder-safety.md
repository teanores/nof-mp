# Release Builder Safety

Status: draft
Project: NOF Main Platform / `nof-mp`
Repository: `nof-platform`

## Purpose

This runbook keeps NOF MP releases scoped when the shared release-builder manifest contains multiple enabled services.

## Current Release Identity

- Local repository: `C:\Users\User\Documents\dev\nof-platform`
- Product identity: NOF Main Platform / `nof-mp`
- Current GitHub repository used by release-builder: `https://github.com/teanores/nof-platform.git`
- Release-builder service key: `nof-platform`
- Kubernetes release: `nof-platform`
- Image repository: `localhost:32000/nof-platform`
- Namespace: `nof-apps`

## Scoped Deploy Rule

When only NOF MP should be deployed, use the scoped builder command:

```bash
/opt/nof-release-builder/nof-release-builder.sh deploy nof-platform <approved-ref>
```

Do not use broad manifest sync for a NOF MP-only release unless every enabled service row is explicitly approved for deployment in the same release window.

## Manifest Sync Rule

The shared manifest may contain several enabled service rows. Before running:

```bash
/opt/nof-release-builder/nof-release-builder.sh sync main
```

confirm and record:

- every enabled service row;
- the approved ref for each service;
- whether each service is intended to deploy now;
- rollback/verification expectations for each service.

If only NOF MP is intended to deploy, use scoped deploy instead.

## Desired State Ownership

Current legacy manifest location:

```text
ops/release-builder/desired-state.tsv
```

Intended future canonical home:

```text
nof-infra
```

Do not migrate the manifest to `nof-infra` until the repository is confirmed, bootstrapped and owner-approved as the canonical infra repo.

## Secrets

The builder reads GitHub credentials from server-side configuration. Do not print:

- `NOF_RELEASE_GITHUB_TOKEN`;
- contents of `~/.config/nof-release-builder/env`;
- Kubernetes secrets;
- registry credentials;
- private SSH keys.

## Evidence

For every NOF MP deploy, record:

- source ref;
- full commit;
- image tag;
- Helm revision;
- rollout status;
- evidence file path;
- rollback command;
- public smoke results.

## Stop Conditions

Stop before deploy if:

- target ref is not pushed or is ambiguous;
- desired state would deploy unrelated services;
- required token/config checks require printing secret values;
- Docker build fails;
- Helm upgrade affects a release other than `nof-platform`;
- rollout does not become ready;
- public smoke shows the wrong product marker, white page, broken login routes or leaked internal data.
