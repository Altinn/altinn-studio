# NVT agent GitOps configuration

This directory is published as the staging-only `nvt-agent` OCI configuration
artifact. The Studio syncroot contains only the artifact source and its root
Flux Kustomization. Reconciliation is deliberately ordered as follows:

1. create the `nvt` namespace and cluster-owned `nvt-managed-csi` StorageClass;
2. create the namespace-scoped Studio Key Vault SecretStore and wait for every
   ExternalSecret to become Ready;
3. reconcile the NVT chart source and HelmRelease.

The public chart is pinned to `0.8.11` (verified OCI digest
`sha256:adbe10641755761859ea5559cadf0c80b763fe128bd86ecaaacb7c1c1544de64`),
using the Flux v1 OCIRepository `ref.digest` selector rather than its mutable
tag. It resolves the coordinated `0.8.11-d36ff8e` production images without
component overrides. The staging release has `producer.enabled: true`,
`agentSchedule.suspend: false`, and the verified `kata-vm-isolation`
RuntimeClass. Its shared AgentRun template carries the matching
`purpose=nvt-agent:NoSchedule` toleration, and the schedule admits at most two
concurrent mediated AgentRuns.
Each Kata AgentRun requests and is limited to 2 CPU and 8 GiB memory. Git
commit attribution is prepared from each exact GitHub App broker grant and
consumed through the generic provider-identity contract.
The shared non-secret bootstrap preseed suppresses Claude first-run prompts and
trusts the agent's `/workspace` startup directory. Codex ignores these Claude
configuration files.

## Prerequisites

Create these Key Vault entries outside Git. Never paste their values into this
repository:

- `nvt-codex-mirkosekulic-credentials`
- `nvt-claude-jondyr-credentials`
- `nvt-agent-private-key-pem`
- `nvt-agent-altinn-private-key-pem`
- `nvt-agent-gateway-oauth-client-secret`
- `nvt-gateway-session-secret`

The verified App, installation, and OAuth client IDs are explicit non-secret
values in `bootstrap/deployment-metadata.yaml`:

- `nvt-agent` is installed only on `mirkoSekulic/altinn-studio`. Its broker
  provider handles fork clone/fetch, branch pushes, and workflow-file writes.
- `nvt-agent-altinn` is installed only on `Altinn/altinn-studio`. The producer
  uses its raw PEM to poll upstream comments. A separate broker provider,
  projected from the same Key Vault PEM, handles upstream PRs, reviews,
  comments, and checks. Do not duplicate the PEM in Key Vault.
- `nvt-agent-gateway` is OAuth-only. It has no App private key, App ID,
  installation ID, webhook secret, repository permission, organization
  permission, or account permission. It is owned by `mirkoSekulic` and is not
  installed in the Altinn organization. Register
  `https://staging.altinn.studio/agents/oauth2/callback`.

The remaining runtime prerequisites are external: the documented Key Vault
secrets must exist, the AKS RuntimeClass and NET_ADMIN admission policy must be
valid, and the staged health and OAuth checks must pass before exercising the
active producer.

The working checkout is `mirkoSekulic/altinn-studio`, with
`Altinn/altinn-studio` configured as the `upstream` remote. Both broker
providers are granted to every run, while provider-scoped mediated proxies
keep fork and upstream operations deterministic.

The existing Studio load balancer exposes the gateway below
`https://staging.altinn.studio/agents`. It preserves the `/agents` prefix for
the gateway's native base-path routing and forwards WebSocket upgrades without
requiring a separate DNS record or origin.

Profile selection uses the verified immutable GitHub subjects `23359247`
(`mirkoSekulic`) and `1525466` (`Jondyr`). The second profile remains named
`jondyr`; only the producer allowlist uses GitHub's canonical, case-sensitive
login spelling.

The deployment uses the exact `kata-vm-isolation` RuntimeClass. RuntimeClass
scheduling selects the AKS Kata pool, while the AgentRun toleration permits the
agent Pod onto its dedicated `purpose=nvt-agent:NoSchedule` taint. Admission
policy must accept the operator's one-shot `NET_ADMIN` routing init container
and capture sidecar contract.

## Activated staging rollout

Before reconciliation, confirm ExternalSecrets, broker, operator, gateway,
GitHub login, subject-based gateway admission, RuntimeClass scheduling, and
the network boundary are Ready. After reconciliation, test with one disposable
`/nvtagent pr create` comment in `Altinn/altinn-studio` and monitor the first
mediated AgentRun through cleanup.

## Storage lifecycle

`nvt-managed-csi` uses Azure Disk CSI with `reclaimPolicy: Delete` and
`WaitForFirstConsumer`. Broker, producer, and persistent AgentRun workspaces
name it explicitly. AgentRun terminal cleanup deletes its owned PVC; Helm or
namespace cleanup deletes platform PVCs; deletion of those PVCs deletes their
PVs and backing Azure disks. There is no intentionally retained NVT disk.
The AgentRun workspace is 30 GiB. DinD's `/var/lib/docker` remains disposable
node-local data and uses the NVT pool's separately configured 256 GiB OS disk.

Broker refresh rotation is written only to its PVC. Key Vault contains recovery
seeds, not a continuously exported copy. Deleting the broker PVC after an
upstream refresh-token rotation can require a new trusted login and Key Vault
seed update. Replacing either recovery value in Key Vault updates
`nvt-broker-seed`; the chart's supported seed reconciliation imports the
changed key and restarts the broker child without exporting rotated broker
state back to Key Vault.

## Rollback and kill switch

Revert/remove the staging syncroot reference to prune the HelmRelease and
uninstall chart-owned resources. Deleting namespace `nvt` is the emergency kill
switch and removes all namespaced releases, Secrets, PVCs, AgentRuns, and Pods;
suspend/remove the root `nvt-agent-config` Kustomization first so Flux does not
immediately recreate it.
After PVC deletion, `nvt-managed-csi` deletes the backing disks. The
cluster-scoped StorageClass is owned by this infrastructure artifact and can be
removed only after confirming no PVC still references it.
