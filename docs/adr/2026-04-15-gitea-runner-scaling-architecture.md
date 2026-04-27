# Dynamic scaling architecture for Gitea org runners

- Status: Proposed
- Deciders: Squad-kjøring
- Date: 15.04.2026

## Result

A1: Compose a scaling architecture from standard Kubernetes and Flux primitives —
a small Go sync CronJob, the existing Helm-based runner chart, KEDA for pod-level
scaling, and the AKS cluster autoscaler for node-level scaling. No custom
Kubernetes operator is introduced.

## Problem context

Altinn Studio runs CI workloads for multiple service owners (tjenesteeiere)
via self-hosted Gitea act_runners. The runners execute untrusted workflow code
written by each service owner, so cross-tenant isolation is a first-class
concern and is already handled at the container runtime level by AKS Pod
Sandboxing (kata containers). This ADR does not revisit that decision; it is
strictly about how the runner **capacity** is provisioned, scaled, and
credentialed.

The current setup has several friction points:

- Adding a new org requires manually editing the runner chart values and merging a PR.
- Runner pods run 24/7 regardless of whether jobs are queued.
- One busy org can starve others — fair capacity sharing is loosely enforced at best.
- Registration tokens are created manually in Gitea and stored as Kubernetes Secrets by hand.
- There is no automated coupling between orgs in Gitea and runner Deployments in the cluster.

We want automatic org discovery, per-org scaling with concurrency caps,
scale-to-zero for cost savings, and observability through our existing OTel
pipeline — all built from standard, reversible components.

## Decision drivers

- D1: Per-org concurrency cap — no single org can starve others.
- D2: Dynamic org membership — no manual chart edits when orgs change.
- D3: Scale-to-zero — don't pay for idle runners or nodes.
- D4: Minimize cold-start during working hours.
- D5: Prefer standard Kubernetes primitives over custom code.
- D6: Minimize custom code; keep it small, stateless, replaceable.
- D7: Observability via OTel.
- D8: Least-privilege credentials.

## Alternatives considered

- A1: Compose from standard primitives (Go CronJob + HelmRelease + KEDA + cluster autoscaler).
- A2: Single custom Kubernetes operator managing everything.
- A3: Static configuration (do nothing).
- A4: Adapt GitHub's actions-runner-controller (ARC) to Gitea.

## Architecture of A1 (the proposed solution)

Four independent components, each responsible for one concern. They
communicate through declarative Kubernetes resources (ConfigMap, Secret,
Deployment) rather than direct API calls between each other.

```
                   ┌──────────────────────────────────────────┐
                   │               Gitea                      │
                   │  (source of truth for orgs and queues)   │
                   └──────────────────────────────────────────┘
                        ▲                              ▲
          read orgs +   │                              │  read queued run
          registration  │                              │  counts per org
          tokens        │                              │  (shared read-only
          (shared       │                              │   PAT — scope:
          admin PAT)    │                              │   read:organization)
                        │                              │
          ┌─────────────┴──────────────┐   ┌───────────┴────────────┐
          │                            │   │                        │
          │   gitea-org-sync           │   │         KEDA           │
          │   (Go CronJob, runs /15m)  │   │   (operator + scaler)  │
          │                            │   │                        │
          │   - discovers orgs         │   │   - one ScaledObject   │
          │   - fetches tokens         │   │     per org Deployment │
          │   - writes Secrets         │   │   - scales replicas    │
          │   - writes ConfigMap       │   │     based on queue     │
          │   - deletes orphans        │   │   - enforces per-org   │
          │   - exports OTel           │   │     maxReplicaCount    │
          │                            │   │                        │
          └──┬─────────────────────┬───┘   └────────────┬───────────┘
             │ writes              │ writes             │ manages
             ▼                     ▼                    │ replica counts
      ┌────────────────┐   ┌──────────────────┐         │
      │ Secret         │   │ ConfigMap        │         │
      │ (per org       │   │ (dynamic org     │         │
      │  registration  │   │  list for chart  │         │
      │  token)        │   │  valuesFrom)     │         │
      └─────┬──────────┘   └────────┬─────────┘         │
            │ referenced            │ consumed          │
            │ by                    │ by valuesFrom     │
            ▼                       ▼                   │
      ┌─────────────────────────────────────────┐       │
      │   gitea-org-runner-config (HelmRelease) │       │
      │                                         │       │
      │   - renders one Deployment per org      │       │
      │     from the dynamic ConfigMap          │       │
      │   - each Deployment references its      │       │
      │     per-org Secret by name              │       │
      │   - kata runtimeClassName, dind         │       │
      │     sidecar, shared workspace, etc.     │       │
      │     (preexisting, unchanged)            │       │
      └─────────────────────┬───────────────────┘       │
                            │                           │
                            │ produces                  │
                            ▼                           │
                    ┌───────────────────┐               │
                    │ Runner Deployments│◄──────────────┘
                    │ (one per org)     │
                    └─────────┬─────────┘
                              │
                              │ schedules pods onto
                              ▼
                    ┌───────────────────────────────┐
                    │ runnerskata nodepool          │
                    │ (AKS, kata-enabled)           │
                    │                               │
                    │ managed by cluster autoscaler │
                    │ - provisions nodes when pods  │
                    │   are Pending                 │
                    │ - drains and removes nodes    │
                    │   when idle                   │
                    └───────────────────────────────┘
```

### Component summary

- **gitea-org-sync** — Go CronJob (~300 lines). Polls Gitea every 15 min,
  discovers orgs, syncs per-org registration-token Secrets and a ConfigMap
  consumed by the runner chart. Also runs once on each HelmRelease deploy
  via a Helm post-install hook. Exports OTel traces and metrics.

- **gitea-org-runner-config** — existing HelmRelease, unchanged. Reads the
  dynamic org list from the ConfigMap via Flux `valuesFrom`, renders one
  Deployment per org with kata + dind setup. `dependsOn` the sync chart.

- **KEDA** — installed via its own HelmRelease. One ScaledObject per org
  Deployment, using the `github-runner` scaler pointed at Gitea's API.
  Enforces per-org `maxReplicaCount`. When enabled, the runner chart omits
  the static `replicas` field so HPA controls the count.

- **AKS cluster autoscaler** — enabled on the runners nodepool via Terraform.
  Provisions nodes when pods are Pending, drains idle nodes. Cold start
  after full scale-to-zero is ~3–5 min; a KEDA cron trigger can optionally
  keep one pod warm during business hours.

### Credential separation

Two distinct Gitea service users with different PATs:

| Purpose            | Service user         | Scope                          | Holder             | Blast radius if leaked                                                                                                             |
| ------------------ | -------------------- | ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| KEDA queue polling | `altinn-keda-scaler` | read:organization              | KEDA operator      | Low. Attacker can see queued workflow counts per org, nothing more.                                                                |
| Runner token sync  | `altinn-runner-sync` | read:admin (runner token read) | gitea-org-sync pod | High. Attacker can read registration tokens and register themselves as a runner for any org, then execute arbitrary workflow code. |

Both PATs live in separate Secrets, mounted only into their respective
component. The KEDA PAT can rotate annually; the sync PAT should rotate
quarterly.

## Pros and cons

### A1: Compose from standard primitives

- Good, because each layer is independent, reversible, and uses standard K8s primitives (D5, D8).
- Good, because per-org concurrency is enforced declaratively via KEDA's `maxReplicaCount` (D1).
- Good, because dynamic org discovery needs only ~300 lines of Go (D2, D6).
- Good, because scale-to-zero works at both pod and node layers, independently (D3).
- Good, because credentials are separated by concern with different blast radii (D8).
- OK, because it introduces a small Go service to maintain. Follows the precedent from ADR 2025-10-17.
- Bad, because four components is more to reason about than one.
- Bad, because cold start after full scale-to-zero is ~3–5 min (D4). Mitigated by optional cron trigger.

### A2: Single custom Kubernetes operator

- Good, because the whole system is in one codebase — easier to trace end-to-end.
- Good, because CRDs can serve as a declarative API for per-org config.
- Bad, because building a production-ready operator is significantly more work (D6): controller-runtime, CRD versioning, finalizers, leader election, health checks, etc.
- Bad, because operator bugs have blast radius across the entire scaling system (D9).
- Bad, because CRDs are a permanent API surface that requires migration stories.
- Bad, because it re-implements what KEDA and cluster autoscaler already do (D5).

### A3: Static configuration (do nothing)

- Good, because no new work. Everything is explicit in Git.
- Bad, because it doesn't solve D1, D2, or D3. Runners run 24/7, orgs are manual, capacity sharing is best-effort.
- Baseline for comparison, not a real solution.

### A4: Adapt ARC to Gitea

- Good, because ARC is mature and already solves a similar problem for GitHub.
- OK, because Gitea's API is intentionally GitHub-compatible for many endpoints, so an adapter layer (not a full fork) might be sufficient.
- Bad, because ARC's auth is hardcoded for GitHub Apps, which Gitea doesn't support. The auth layer would need rewriting.
- Bad, because ARC's scaling uses GitHub-specific webhooks whose payload format may differ from Gitea's.
- Bad, because maintaining a Gitea adapter on top of ARC's frequent releases is ongoing work that likely exceeds writing the Go CronJob from scratch.

## Rollout phases

| Phase | Action                                               | Outcome                                        |
| ----- | ---------------------------------------------------- | ---------------------------------------------- |
| 1     | Finalize current kata + chart work                   | Stable kata-based runners with static replicas |
| 2     | Install KEDA, generate PATs, create secrets          | KEDA operator ready; no behavior change yet    |
| 2.5   | Deploy gitea-org-sync HelmRelease (off initially)    | Sync binary templated but not active           |
| 3     | Add KEDA templates to runner chart (off initially)   | Templates present but `keda.enabled: false`    |
| 4     | Enable KEDA on staging                               | Staging pods auto-scale on queue               |
| 5     | Enable KEDA on prod                                  | Prod pods auto-scale; nodes still fixed        |
| 6     | Enable cluster autoscaler on runners nodepool        | Full scale-to-zero (pods + nodes)              |
| 7     | Add cron trigger for business-hours warm pool        | No cold-start during working hours             |
| 8     | Security hardening (network policy, SA tokens, etc.) | Defense-in-depth beyond kata boundary          |

Each phase is independently verifiable and reversible.
