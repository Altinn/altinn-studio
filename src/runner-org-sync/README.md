# runner-org-sync

A small, idempotent Kubernetes CronJob that bridges the Altinn organisation
list (published on the public CDN) to the per-organisation Gitea Actions
runners running in the Studio cluster.

## What it does

Every 15 minutes it:

1. Loads the Gitea admin PAT from Azure Key Vault (via Workload Identity), or
   from a local env var override for development.
2. Fetches `altinn-orgs.json` from `https://altinncdn.no/orgs/altinn-orgs.json`.
3. Filters orgs to those with at least one declared `environments` entry,
   then intersects with a whitelist supplied via env var.
4. For each org in the desired set:
   - if a `Secret altinn-gitea-runner-<org>-secret` already exists, leaves it
     alone — registered tokens are preserved across reconciles,
   - otherwise mints a fresh registration token via Gitea's admin API and
     creates the Secret.
5. Deletes Secrets for orgs that are no longer in the desired set.
6. Writes a single `ConfigMap/runner-org-list` projecting the desired set;
   the `gitea-org-runner-config` HelmRelease picks this up via Flux
   `valuesFrom` and renders one runner Deployment per entry.

Continue-on-partial-failure: a single org failing to mint does not abort the
run. Failed orgs are simply omitted from this tick's ConfigMap and retried
on the next; failures surface through metrics (`runner_org_sync.org.reconcile_errors`)
rather than CronJob exit codes.

## Architecture

```
                Azure Key Vault
                       │
                       │  Workload Identity
                       ▼
   altinncdn.no  ──► runner-org-sync (CronJob /15min)
   altinn-orgs.json           │
                              │ filter: environments != ∅ ∧ whitelist
                              ▼
                  ┌───────────────────────────────────────────┐
                  │           studio-runners ns                │
                  │                                            │
                  │   per-org Secrets    ConfigMap            │
                  │   ┌──────────────┐  ┌─────────────────┐   │
                  │   │ ttd-secret   │  │ runner-org-list │   │
                  │   │ brg-secret   │  │   - ttd         │   │
                  │   │ dsb-secret   │  │   - brg         │   │
                  │   │ ...          │  │   - dsb         │   │
                  │   └──────┬───────┘  └────────┬────────┘   │
                  │          │                   │            │
                  └──────────┼───────────────────┼────────────┘
                             │                   │ valuesFrom
                             │                   ▼
                             │       ┌───────────────────────────────┐
                             │       │ gitea-org-runner-config       │
                             │       │ HelmRelease (Flux)            │
                             │       │                               │
                             │       │ renders one Deployment        │
                             │       │ per org-in-ConfigMap          │
                             │       └────────────┬──────────────────┘
                             │                    │
                             │ secretKeyRef       │
                             ▼                    ▼
                  ┌───────────────────────────────────────────┐
                  │   Gitea Actions runner Deployments        │
                  │   one per org, each ephemeral             │
                  └───────────────────────────────────────────┘
                              │
                              ▼
                          OTel collector
                  (traces + metrics + logs at
                   otel-router.observability:4317)
```

Two distinct credentials live in distinct stores:

| Credential                                 | Sensitivity               | Storage                                                                                                       |
| ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Gitea admin PAT (mints tokens for any org) | High                      | Azure Key Vault, fetched at pod start via Workload Identity. Never persisted in K8s.                          |
| Per-org runner registration token          | Lower (scoped to one org) | K8s Secret `altinn-gitea-runner-<org>-secret`, key `token`. Consumed by runner Deployment via `secretKeyRef`. |

## Configuration

All settings come from environment variables. The loader fails fast at
startup and aggregates every validation problem into one error.

| Variable                               | Required            | Purpose                                                                                            |
| -------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `RUNNER_ORG_SYNC_GITEA_URL`            | yes                 | Base URL for Gitea admin API                                                                       |
| `RUNNER_ORG_SYNC_ORGS_JSON_URL`        | yes                 | URL of `altinn-orgs.json`                                                                          |
| `RUNNER_ORG_SYNC_OUTPUT_NAMESPACE`     | yes                 | Target namespace (e.g. `studio-runners`)                                                           |
| `RUNNER_ORG_SYNC_SECRET_NAME_PATTERN`  | yes                 | Must contain the `{org}` placeholder, e.g. `altinn-gitea-runner-{org}-secret`                      |
| `RUNNER_ORG_SYNC_CONFIGMAP_NAME`       | yes                 | e.g. `runner-org-list`                                                                             |
| `RUNNER_ORG_SYNC_KEYVAULT_NAME`        | if no env PAT       | Azure Key Vault name                                                                               |
| `RUNNER_ORG_SYNC_KEYVAULT_SECRET_NAME` | if no env PAT       | Secret name inside the vault                                                                       |
| `RUNNER_ORG_SYNC_SYNC_ALL`             | no                  | `true` to skip the whitelist filter                                                                |
| `RUNNER_ORG_SYNC_ORGS`                 | if `SYNC_ALL=false` | CSV whitelist, e.g. `ttd,brg,dsb`                                                                  |
| `RUNNER_ORG_SYNC_GITEA_PAT`            | no                  | Local-dev bypass for Key Vault. Source is logged at startup.                                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT`          | no                  | OTel collector endpoint (defaults via SDK)                                                         |
| `OTEL_SERVICE_NAME`                    | no                  | Defaults to `runner-org-sync`                                                                      |
| `OTEL_RESOURCE_ATTRIBUTES`             | no                  | e.g. `deployment.environment=dev`                                                                  |
| `AZURE_*`                              | injected            | Workload Identity webhook fills `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE` |

## Reconcile algorithm

```
desired = (orgs with non-empty environments) ∩ whitelist     (or all if syncAll=true)
existing_secrets = Secrets matching SECRET_NAME_PATTERN

for org in desired:
    if Secret exists for org:
        skip (preserve registered token)
    else:
        mint registration token via Gitea
        create Secret

for secret in existing_secrets:
    if secret.org not in desired:
        delete Secret

apply ConfigMap with one entry per (desired ∩ orgs whose Secret now exists)
```

Existing Secrets are never re-minted; this preserves any in-flight runner
registrations and avoids churn on Deployments that already work. Deletions
remove only the K8s Secret; orphaned Gitea-side runner records are left to
go idle (cleanup is a separate concern).

## Observability

This service emits OpenTelemetry traces and metrics; logs are kept thin and
intended for `kubectl logs` triage only.

**Traces** — one root span per reconcile run, with per-stage children. Per-org
work surfaces as span events on the parent span (`org.token.minted`,
`org.secret.created`, `org.secret.deleted`, `org.skipped`).

**Metrics** — see the package source for the canonical list. Highlights:

- `runner_org_sync.reconcile.duration` (histogram, by outcome)
- `runner_org_sync.secrets.created` / `.deleted` / `.skipped` (counters)
- `runner_org_sync.org.reconcile_errors` (counter, by org and stage) —
  **the signal worth paging on if sustained non-zero**
- `runner_org_sync.{gitea,cdn,keyvault}.call.duration` (histograms)

**Logs** — JSON via `slog`, ~5 lines per healthy run plus any WARNs:

```
reconcile.start    run_id=...
pat.loaded         source=keyvault len=40
orgs.kept          count=9 orgs=[ttd,brg,dsb,...]
org.reconcile.failed   org=dsb stage=mint err=...      (WARN, only on failure)
reconcile.end      duration_ms=... outcome=success|partial|failure
```

## Local development

The Gitea PAT can come from an env var instead of Key Vault, sidestepping
the need for Azure auth on a laptop:

```sh
export RUNNER_ORG_SYNC_GITEA_PAT='your-local-or-test-pat'
export RUNNER_ORG_SYNC_GITEA_URL='http://localhost:3000'
export RUNNER_ORG_SYNC_ORGS_JSON_URL='https://altinncdn.no/orgs/altinn-orgs.json'
export RUNNER_ORG_SYNC_OUTPUT_NAMESPACE='studio-runners'
export RUNNER_ORG_SYNC_SECRET_NAME_PATTERN='altinn-gitea-runner-{org}-secret'
export RUNNER_ORG_SYNC_CONFIGMAP_NAME='runner-org-list'
export RUNNER_ORG_SYNC_ORGS='ttd,brg'

go run ./cmd/runner-org-sync
```

The first log line will read `pat.loaded source=env`, making any accidental
fallback in a non-local environment immediately visible.

## Testing

```sh
make test         # unit tests with race detector
make test-cover   # coverage report at coverage.html
make lint         # golangci-lint
```

Unit tests use stdlib `testing`, `net/http/httptest`, and
`k8s.io/client-go/kubernetes/fake`. No testify, no other test frameworks.

Integration tests (kind-based) live under `test/integration/` and use stub
CDN + stub Gitea services in-cluster. They cover seven scenarios:

1. Cold start
2. Idempotent re-run (no writes on unchanged input)
3. Org added
4. Org removed
5. Org with empty `environments` (filtered out)
6. Whitelist excludes
7. Gitea partial failure (one org fails, others succeed)

Workload Identity is Azure-specific and is not covered by kind tests;
verify that path manually in a dev cluster.

## Project layout

```
.
├── cmd/runner-org-sync/        entry point
├── internal/
│   ├── config/                 env-var loading + validation
│   ├── cdn/                    altinn-orgs.json fetch + decode
│   ├── gitea/                  registration-token mint client
│   ├── keyvault/               PAT loader (env override → Key Vault)
│   ├── k8sstate/               Secret + ConfigMap reconcile primitives
│   ├── reconcile/              pure orchestration
│   └── telemetry/              OTel + slog wiring
├── test/integration/           kind harness + scenarios
├── infra/kustomize/            Kubernetes manifests (Flux post-build substitution)
├── Dockerfile
├── Makefile
├── go.mod, go.sum
└── README.md
```
