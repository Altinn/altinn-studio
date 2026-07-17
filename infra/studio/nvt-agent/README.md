# NVT agent GitOps configuration

This directory is published as the staging-only `nvt-agent` OCI configuration
artifact. The Studio syncroot contains only the artifact source and its root
Flux Kustomization. Reconciliation is deliberately ordered as follows:

1. create the `nvt` namespace and cluster-owned `nvt-managed-csi` StorageClass;
2. create the namespace-scoped Studio Key Vault SecretStore and wait for every
   ExternalSecret to become Ready;
3. reconcile the NVT chart source and HelmRelease.

The public chart is pinned to `0.8.1` (verified OCI digest
`sha256:3c2aa084dacca0f765f4669fe5c9788e03b6648287fd37d9bfe7929ba19ef298`),
which resolves the coordinated `0.8.1-4d21db7` production images without
component overrides. The initial release keeps
`agentSchedule.suspend: true` and `producer.enabled: false`; broker, operator,
gateway, CRDs, TLS, PVCs, and network policy configuration can therefore be
checked without admitting AgentRuns.

## Prerequisites

Create these Key Vault entries outside Git. Never paste their values into this
repository:

- `nvt-codex-mirkosekulic-credentials`
- `nvt-claude-jondyr-credentials`
- `nvt-agent-private-key-pem`
- `nvt-agent-altinn-private-key-pem`
- `nvt-agent-gateway-oauth-client-secret`
- `nvt-gateway-session-secret`

Keep the unresolved App, installation, and OAuth client IDs explicit in
`bootstrap/deployment-metadata.yaml` until the applications exist:

- `nvt-agent` is installed only on `mirkoSekulic/altinn-studio`. Its broker
  provider handles fork clone/fetch, branch pushes, and workflow-file writes.
- `nvt-agent-altinn` is installed only on `Altinn/altinn-studio`. The producer
  uses its raw PEM to poll upstream comments. A separate broker provider,
  projected from the same Key Vault PEM, handles upstream PRs, reviews,
  comments, and checks. Do not duplicate the PEM in Key Vault.
- `nvt-agent-gateway` is OAuth-only. It has no App private key, App ID,
  installation ID, or webhook secret. Register
  `https://agents.altinn.studio/oauth2/callback`; its OAuth permissions and
  Altinn approval must allow the bounded organization-membership lookup.

The working checkout is `mirkoSekulic/altinn-studio`, with
`Altinn/altinn-studio` configured as the `upstream` remote. Both broker
providers are granted to every run, while provider-scoped mediated proxies
keep fork and upstream operations deterministic.

DNS is not owned by either repository. Before gateway testing, the external
DNS owner must point `agents.altinn.studio` at the declared Studio staging load
balancer address (`52.157.218.253`). The existing `*.altinn.studio` certificate
covers this dedicated origin.

Profile selection uses the verified immutable GitHub subjects `23359247`
(`mirkoSekulic`) and `1525466` (`Jondyr`). The second profile remains named
`jondyr`; only the producer allowlist uses GitHub's canonical, case-sensitive
login spelling.

Before activation, verify that AKS exposes the exact `kata-vm-isolation`
RuntimeClass and that its scheduling rules target/tolerate the NVT pool. Chart
`0.8.1` does not expose raw AgentRun node selectors or tolerations, so this is
an activation gate rather than a guessed value in the initial release. Also
verify that admission policy accepts the operator's one-shot `NET_ADMIN`
routing init container and capture sidecar contract.

## Activation

After ExternalSecrets, broker, operator, and gateway are Ready, verify GitHub
login and Altinn membership admission while the schedule remains suspended.
Then make a small reviewed values change that sets `producer.enabled: true`,
sets the verified `agentSchedule.template.runtimeClassName`, and finally sets
`agentSchedule.suspend: false`. Test with one disposable
`/nvtagent pr create` comment in `Altinn/altinn-studio`.

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
