# NVT agent GitOps configuration

This directory is published as the staging-only `nvt-agent` OCI configuration
artifact. The Studio syncroot contains only the artifact source and its root
Flux Kustomization. Reconciliation is deliberately ordered as follows:

1. create the `nvt` namespace and cluster-owned `nvt-managed-csi` StorageClass;
2. create the namespace-scoped Studio Key Vault SecretStore and wait for every
   ExternalSecret to become Ready;
3. reconcile the NVT chart source and HelmRelease.

The public chart is pinned to `0.8.57` (verified OCI digest
`sha256:267d4f1a420bfdab10f3f54c72d8082d2c007648a1710134367801278d30f02d`),
using the Flux v1 OCIRepository `ref.digest` selector rather than its mutable
tag. It resolves the coordinated `0.8.57-fc6a567` production images without
component overrides. All execution profiles explicitly select the built-in
Kubernetes Pod driver. The staging release has `producer.enabled: true`,
`agentSchedule.suspend: false`, and the verified `kata-vm-isolation`
RuntimeClass. Its shared AgentRun template carries the matching
`purpose=nvt-agent:NoSchedule` toleration, and the schedule admits at most two
concurrent mediated AgentRuns.
The `mirkoSekulic` execution profile explicitly adds `SYS_PTRACE` to its agent
container for approved debugging and profiling; no other profile or container
inherits that capability.
The producer requests the `implement-pr` workflow, which permits task-required
tool installation and directs branch pushes and pull-request operations through
the single `github-main` broker provider for `Altinn/altinn-studio`.
Codex and Claude profiles configure their native continuation commands, so a
recreated Pod resumes the durable session instead of replaying the initial task.
Each Kata AgentRun requests and is limited to 2 CPU and 8 GiB memory. Git
commit attribution is explicitly pinned to the `nvt-agent` GitHub App bot.
The shared non-secret bootstrap preseed suppresses Claude first-run prompts and
trusts the agent's `/workspace` startup directory. Codex ignores these Claude
configuration files.

## Prerequisites

Create these Key Vault entries outside Git. Never paste their values into this
repository:

- `nvt-codex-mirkosekulic-credentials`
- `nvt-claude-jondyr-credentials`
- `nvt-claude-nkylstad-credentials`
- `nvt-claude-erlinghauan-credentials`
- `nvt-agent-private-key-pem`
- `nvt-agent-gateway-oauth-client-secret`
- `nvt-gateway-session-secret`
- `nvt-credential-portal-session-secret`

The verified App, installation, and OAuth client IDs are explicit non-secret
values in `bootstrap/deployment-metadata.yaml`:

- `nvt-agent` is installed on `Altinn/altinn-studio`. The producer and the
  `github-main` broker provider share its Key Vault PEM and exact Altinn
  installation ID. The provider handles clone/fetch, branch pushes, workflow
  files, pull requests, comments, reviews, and check reads.
- `nvt-agent-gateway` is OAuth-only. It has no App private key, App ID,
  installation ID, webhook secret, repository permission, organization
  permission, or account permission. It is owned by `mirkoSekulic` and is not
  installed in the Altinn organization. Register both callback URLs on the
  OAuth app: `https://staging.altinn.studio/agents/oauth2/callback` and
  `https://staging.altinn.studio/agents/credentials/oauth2/callback`.

The remaining runtime prerequisites are external: the documented Key Vault
secrets must exist, the AKS RuntimeClass and NET_ADMIN admission policy must be
valid, and the staged health and OAuth checks must pass before exercising the
active producer.

The working checkout is `Altinn/altinn-studio` with a single `origin` remote.
Every run receives only the repository-scoped `github-main` grant; there is no
fork checkout or second GitHub App provider.

The existing Studio load balancer exposes the gateway below
`https://staging.altinn.studio/agents`. It preserves the `/agents` prefix for
the gateway's native base-path routing and forwards WebSocket upgrades without
requiring a separate DNS record or origin.

The standalone credential portal is available at
`https://staging.altinn.studio/agents/credentials`. It reuses GitHub OAuth for
identity but has an independent session cookie. Each GitHub subject can modify
only its configured Codex or Claude slot. The gateway links to the portal but
does not proxy it or share its session.

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

Broker refresh rotation is written only to its PVC. The portal patches the
pre-created `nvt-portal-seed` Secret, and the broker's seed supervisor imports
accepted replacements atomically. `nvt-broker-seed` remains an External
Secrets-managed recovery source during rollout, but it is no longer consumed
by the release and cannot overwrite portal enrollment. Deleting the namespace
or both broker storage and `nvt-portal-seed` loses the current credentials, so
retain a separate recovery procedure until portal enrollment is proven.

## Rollback and kill switch

Revert/remove the staging syncroot reference to prune the HelmRelease and
uninstall chart-owned resources. Deleting namespace `nvt` is the emergency kill
switch and removes all namespaced releases, Secrets, PVCs, AgentRuns, and Pods;
suspend/remove the root `nvt-agent-config` Kustomization first so Flux does not
immediately recreate it.
After PVC deletion, `nvt-managed-csi` deletes the backing disks. The
cluster-scoped StorageClass is owned by this infrastructure artifact and can be
removed only after confirming no PVC still references it.
