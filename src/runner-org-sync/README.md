# runner-org-sync

A small, idempotent Kubernetes CronJob that bridges the Altinn organisation
list (published on the public CDN) to the per-organisation Gitea Actions
runners running in the Studio cluster.

## What it does

Each scheduled run (cadence configured by `spec.schedule` in
`infra/kustomize/cronjob.yaml`):

1. Loads the **admin** Gitea PAT from Azure Key Vault (via Workload Identity),
   or from a local env var override for development.
2. Loads the **read-only** Gitea PAT from the same Key Vault (different
   secret name). This is the PAT KEDA's `github-runner` scaler will use.
3. Fetches `altinn-orgs.json` from `https://altinncdn.no/orgs/altinn-orgs.json`.
4. Filters orgs to those with at least one declared `environments` entry,
   then intersects with a whitelist supplied via env var.
5. For each org in the desired set:
   - if a `Secret altinn-gitea-runner-<org>-secret` already exists, leaves it
     alone — registered tokens are preserved across reconciles,
   - otherwise mints a fresh registration token via Gitea's admin API and
     creates the Secret.
6. Deletes Secrets for orgs that are no longer in the desired set.
7. Writes a single `ConfigMap/runner-org-list` projecting the desired set;
   the `gitea-org-runner-config` HelmRelease picks this up via Flux
   `valuesFrom` and renders one KEDA `ScaledJob` per entry.
8. Projects the read-only PAT into an Opaque `Secret/keda-gitea-pat` (or
   the name configured via env). KEDA's `TriggerAuthentication` references
   this Secret. The Secret is created on first run; on subsequent runs it
   is updated only when the KV value has changed.

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
   altinncdn.no  ──► runner-org-sync (CronJob)
   altinn-orgs.json           │
                              │ filter: environments != ∅ ∧ whitelist
                              ▼
                  ┌─────────────────────────────────────────────────────┐
                  │                  studio-runners ns                  │
                  │                                                     │
                  │   per-org Secrets    ConfigMap         KEDA Secret  │
                  │   ┌──────────────┐  ┌─────────────────┐ ┌─────────┐ │
                  │   │ ttd-secret   │  │ runner-org-list │ │ keda-   │ │
                  │   │ brg-secret   │  │   - ttd         │ │ gitea-  │ │
                  │   │ dsb-secret   │  │   - brg         │ │ pat     │ │
                  │   │ ...          │  │   - dsb         │ │         │ │
                  │   └──────┬───────┘  └────────┬────────┘ └────┬────┘ │
                  │          │                   │               │      │
                  └──────────┼───────────────────┼───────────────┼──────┘
                             │                   │ valuesFrom    │
                             │                   ▼               │
                             │     ┌───────────────────────────┐ │ secret
                             │     │ gitea-org-runner-config   │ │ TargetRef
                             │     │ HelmRelease (Flux)        │ │
                             │     │ renders one ScaledJob     │ │
                             │     │ per org-in-ConfigMap      │ │
                             │     └────────────┬──────────────┘ │
                             │                  │                ▼
                             │                  ▼          ┌──────────────────┐
                             │           ┌──────────────┐  │ TriggerAuth      │
                             │           │  ScaledJob   │◄─┤ keda-gitea-auth  │
                             │           │  (per org)   │  └──────────────────┘
                             │           └──────┬───────┘
                             │ secretKeyRef     │ KEDA creates Jobs on demand
                             ▼                  ▼
                  ┌──────────────────────────────────────────────────────┐
                  │   Jobs (one per workflow; pod registers, runs,       │
                  │   exits; GC'd after ttlSecondsAfterFinished)         │
                  └──────────────────────────────────────────────────────┘
                              │
                              ▼
                          OTel collector
                  (traces + metrics + logs at
                   otel-router.observability:4317)
```

Three distinct credentials, three storage strategies:

| Credential                                 | Sensitivity               | Storage                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gitea admin PAT (mints tokens for any org) | High                      | Azure Key Vault, fetched at pod start via Workload Identity. Never persisted in K8s.                                                                                                                 |
| Per-org runner registration token          | Lower (scoped to one org) | K8s Secret `altinn-gitea-runner-<org>-secret`, key `token`. Minted by runner-org-sync on first appearance of the org, consumed by the runner Pod (created by KEDA's ScaledJob) via `secretKeyRef`.   |
| Read-only Gitea PAT for KEDA scaler        | Lower (read-only on orgs) | Azure Key Vault → projected to K8s Secret `keda-gitea-pat`, key `token`, by runner-org-sync each tick. Consumed by KEDA's `TriggerAuthentication`. Rotates when the KV value changes (≤ tick + 30s). |

### KEDA wiring

The `TriggerAuthentication/keda-gitea-auth` lives in
`infra/kustomize/triggerauthentication.yaml` — ships with this service so
the Secret writer and the auth ref are deployed atomically. Three names
must agree across this folder and the workload chart:

| Where                                 | Field                                                  | Value                      |
| ------------------------------------- | ------------------------------------------------------ | -------------------------- |
| `cronjob.yaml` (env)                  | `RUNNER_ORG_SYNC_KEDA_PAT_SECRET_NAME` / `_SECRET_KEY` | `keda-gitea-pat` / `token` |
| `triggerauthentication.yaml`          | `secretTargetRef.name` / `.key`                        | `keda-gitea-pat` / `token` |
| `charts/gitea-org-runner/values.yaml` | `keda.authenticationRef.name`                          | `keda-gitea-auth`          |

The chart only consumes the TriggerAuth name as a reference; it does not
define the Secret or the TriggerAuth itself. Renaming any of the above
requires updating all four entries together — otherwise KEDA scalers
fail with `auth ref not found`.

## Configuration

All settings come from environment variables. The loader fails fast at
startup and aggregates every validation problem into one error.

| Variable                                        | Required            | Purpose                                                                                            |
| ----------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `RUNNER_ORG_SYNC_GITEA_URL`                     | yes                 | Base URL for Gitea admin API                                                                       |
| `RUNNER_ORG_SYNC_ORGS_JSON_URL`                 | yes                 | URL of `altinn-orgs.json`                                                                          |
| `RUNNER_ORG_SYNC_OUTPUT_NAMESPACE`              | yes                 | Target namespace (e.g. `studio-runners`)                                                           |
| `RUNNER_ORG_SYNC_SECRET_NAME_PATTERN`           | yes                 | Must contain the `{org}` placeholder, e.g. `altinn-gitea-runner-{org}-secret`                      |
| `RUNNER_ORG_SYNC_CONFIGMAP_NAME`                | yes                 | e.g. `runner-org-list`                                                                             |
| `RUNNER_ORG_SYNC_KEYVAULT_NAME`                 | if no env admin PAT | Azure Key Vault name (shared by both PATs)                                                         |
| `RUNNER_ORG_SYNC_KEYVAULT_SECRET_NAME`          | if no env admin PAT | KV secret name holding the **admin** PAT                                                           |
| `RUNNER_ORG_SYNC_KEDA_PAT_KEYVAULT_SECRET_NAME` | if no env KEDA PAT  | KV secret name holding the **read-only** PAT for KEDA                                              |
| `RUNNER_ORG_SYNC_KEDA_PAT_SECRET_NAME`          | yes                 | Name of the K8s Secret to write the read-only PAT into (e.g. `keda-gitea-pat`)                     |
| `RUNNER_ORG_SYNC_KEDA_PAT_SECRET_KEY`           | yes                 | Data key inside that Secret (e.g. `token`)                                                         |
| `RUNNER_ORG_SYNC_SYNC_ALL`                      | no                  | `true` to skip the whitelist filter                                                                |
| `RUNNER_ORG_SYNC_ORGS`                          | if `SYNC_ALL=false` | CSV whitelist, e.g. `ttd,brg,dsb`                                                                  |
| `RUNNER_ORG_SYNC_GITEA_PAT`                     | no                  | Local-dev bypass for admin PAT lookup. Source is logged at startup.                                |
| `RUNNER_ORG_SYNC_KEDA_PAT`                      | no                  | Local-dev bypass for KEDA PAT lookup. Source is logged at startup.                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                   | no                  | OTel collector endpoint (defaults via SDK)                                                         |
| `OTEL_SERVICE_NAME`                             | no                  | Defaults to `runner-org-sync`                                                                      |
| `OTEL_RESOURCE_ATTRIBUTES`                      | no                  | e.g. `deployment.environment=dev`                                                                  |
| `AZURE_*`                                       | injected            | Workload Identity webhook fills `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE` |

## Reconcile algorithm

```
adminPAT = loadPAT(env override → else KV)
kedaPAT  = loadPAT(env override → else KV)

desired = (orgs with non-empty environments) ∩ whitelist     (or all if syncAll=true)
existing_secrets = managed Secrets in the output namespace

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

apply Opaque Secret <KEDA_PAT_SECRET_NAME> with key=token, value=kedaPAT
    (no-op if existing value matches; update otherwise)
```

Existing per-org Secrets are never re-minted; this preserves any in-flight
runner registrations and avoids churn on ScaledJobs that already work. The
KEDA Secret IS updated when the KV value changes, so KV rotation propagates
automatically within one tick + KEDA's polling interval. Deletions remove
only the K8s Secret; orphaned Gitea-side runner records are left to go idle
(cleanup is a separate concern).

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

**Logs** — JSON via `slog`, ~7 lines per healthy run plus any WARNs:

```
reconcile.start          run_id=...
pat.loaded               scope=admin source=keyvault len=40
pat.loaded               scope=keda  source=keyvault len=40
orgs.kept                count=9 orgs=[ttd,brg,dsb,...]
org.reconcile.failed     org=dsb stage=mint err=...                (WARN, only on failure)
keda.secret.applied      secret=keda-gitea-pat changed=true|false
reconcile.end            duration_ms=... outcome=success|partial|failure
```

The `pat.loaded` lines surface the source per credential — accidental
fallback to env override in a non-local environment is immediately visible.
`keda.secret.applied changed=true` is the audit trail for a KV rotation
propagation.

## Local development

Both PATs can come from env vars instead of Key Vault, sidestepping the
need for Azure auth on a laptop:

```sh
export RUNNER_ORG_SYNC_GITEA_PAT='your-local-or-test-admin-pat'
export RUNNER_ORG_SYNC_KEDA_PAT='your-local-or-test-readonly-pat'
export RUNNER_ORG_SYNC_GITEA_URL='http://localhost:3000'
export RUNNER_ORG_SYNC_ORGS_JSON_URL='https://altinncdn.no/orgs/altinn-orgs.json'
export RUNNER_ORG_SYNC_OUTPUT_NAMESPACE='studio-runners'
export RUNNER_ORG_SYNC_SECRET_NAME_PATTERN='altinn-gitea-runner-{org}-secret'
export RUNNER_ORG_SYNC_CONFIGMAP_NAME='runner-org-list'
export RUNNER_ORG_SYNC_KEDA_PAT_SECRET_NAME='keda-gitea-pat'
export RUNNER_ORG_SYNC_KEDA_PAT_SECRET_KEY='token'
export RUNNER_ORG_SYNC_ORGS='ttd,brg'

go run ./cmd/runner-org-sync
```

The startup log will read `pat.loaded scope=admin source=env` and
`pat.loaded scope=keda source=env`, making any accidental fallback in a
non-local environment immediately visible.

## Testing

```sh
make test         # unit tests with race detector
make test-cover   # coverage report at coverage.html
make lint         # golangci-lint
```

Unit tests use stdlib `testing`, `net/http/httptest`, and
`k8s.io/client-go/kubernetes/fake`. No testify, no other test frameworks.

End-to-end integration testing (kind-based, real Gitea + real KEDA, scenarios
TBD) is **in progress** — the approach is being designed alongside the
staging rollout rather than scaffolded up-front. Workload Identity is
Azure-specific and won't be covered by kind tests regardless; that path is
verified manually in a real cluster.
