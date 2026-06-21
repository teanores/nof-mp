# Release Builder Safety

Status: accepted service-local boundary
Project: NOF Main Platform / `nof-mp`
Repository: `nof-mp`

## Purpose

This runbook keeps NOF MP releases scoped and ensures release execution stays owned by `nof-infra`.

## Current Release Identity

- Local repository: `C:\Users\User\Documents\dev\NOF\nof-mp` after local folder rename
- Product identity: NOF Main Platform / `nof-mp`
- Target GitHub repository: `https://github.com/teanores/nof-mp.git`
- Target release-builder service key: `nof-mp`
- Target Kubernetes release: `nof-mp`
- Target image repository: `localhost:32000/nof-mp`
- Namespace: `nof-apps`

## Scoped Deploy Rule

When only NOF MP should be deployed, prepare and publish a semver tag in this repository, then ask `nof-infra` to execute its release-builder workflow:

```text
repository: git@github.com:teanores/nof-infra.git
workflow: .github/workflows/release-builder.yml
service: nof-mp
ref: <approved-semver-tag>
approval_id: <owner approval / tracker evidence id>
execute_deploy: true
```

The workflow delegates execution to the hbl release-builder. NOF MP agents must not print or run direct SSH deploy commands as the routine path.

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

If only NOF MP is intended to deploy, use the nof-infra one-service workflow dispatch instead.

## Desired State Ownership

Current legacy manifest location:

```text
ops/release-builder/desired-state.tsv
```

Canonical infrastructure home:

```text
nof-infra/environments/hbl/desired-state.tsv
```

Do not push enabled desired-state rows as a side effect of nof-mp application work. Desired-state is controlled by nof-infra.

## Secrets

The builder reads GitHub credentials from server-side configuration. Do not print:

- `NOF_RELEASE_GITHUB_TOKEN`;
- contents of `~/.config/nof-release-builder/env`;
- Kubernetes secrets;
- registry credentials;
- private SSH keys.
- direct SSH deploy commands from nof-mp service-local tooling.

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
- the nof-infra workflow cannot be used and the owner has not explicitly approved a break-glass manual release-builder exception;
- desired state would deploy unrelated services;
- required token/config checks require printing secret values;
- Docker build fails;
- Helm upgrade affects a release other than `nof-mp`;
- rollout does not become ready;
- public smoke shows the wrong product marker, white page, broken login routes or leaked internal data.
