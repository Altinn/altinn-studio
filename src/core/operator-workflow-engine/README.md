# operator-workflow-engine

The operator-workflow-engine hosts the [workflow engine](../../Runtime/workflow-engine/README.md) for the
[core operator](../operator/README.md). It composes the engine library and adds one command, `OperatorCommand`,
which runs a step by calling the operator. It runs in the Studio cluster, and the operator is its only client.

## Why it exists

The operator runs work that must outlive a request: a run waits in a queue, then for a pod, then for the caller's
archive, then for a result, and then the operator cleans up. The operator should survive a restart in the middle of
that without losing a run, and it runs as one replica. So it keeps nothing of a run itself, and it writes no retry or
timer code of its own. The engine keeps the run, in the workflow's labels and step states, and gives it durable steps:

- a step that fails is retried with backoff,
- a step that waits defers, and the engine calls it again later without holding a worker,
- a wait budget bounds each wait,
- a run can be canceled,
- an idempotency key turns two creates at the same time into one run, and
- labels let a caller find its runs again by their source.

The [Altinn app host](../../Runtime/workflow-engine-app/README.md) serves apps in the runtime clusters, with its own
command and callback authentication. This host has its own database, so the operator's runs never share a queue with
app workflows.

## How a step reaches the operator

The operator enqueues one workflow for each run through the engine's API, with an `operator` command for each step.
The [operator README](../operator/README.md#a-run-step-by-step) lists the steps. For each attempt of a step, the
command posts the callback payload to `OperatorCommandSettings.CommandEndpoint` followed by the step's command key,
such as `run.admit`. The operator answers with the step's outcome. The
[callback contract](../operator/README.md#callback-contract) describes the payload and the answers. The command
classifies the answers the way the app host's `AppCommand` does.

The examples in [`api/callbacks`](../operator/api/callbacks) are the contract. The tests of this host check that the
command sends and reads them, and the operator's tests check its side against the same files. Change them together
with both sides.

The command authenticates with a projected ServiceAccount token with the audience `core-operator`, which the
Deployment mounts at `OperatorCommandSettings.TokenPath`. The operator checks it with a TokenReview. The kubelet
rotates the token before it expires, so the command reads the file for every callback. When the file cannot be read,
the step fails with a retryable error rather than calling the operator, which would refuse it for good.

The engine's own API has no authentication. The NetworkPolicy lets only the operator's pods reach it.

## The database

The engine stores workflows in a dedicated Azure Database for PostgreSQL flexible server in each environment, and
applies its migrations at startup. The server is provisioned in altinn-studio-infra, outside this repository. The host
logs in with its Entra identity, the workload identity of the `operator-workflow-engine` ServiceAccount. A connection
string without a password makes the engine fetch an Entra token for it and refresh it before it expires. The
connection string has this shape:

```text
Host=<server>.postgres.database.azure.com;Port=5432;Database=<database>;Username=<role of the Entra identity>;Ssl Mode=VerifyFull;GSS Encryption Mode=Disable
```

The host reads the connection string from `/app/secrets/secrets.json`. An ExternalSecret renders that file from the
Key Vault secret `operator-workflow-engine-connection-string` in the Studio Key Vault. The Key Vault's existing
SecretStore lives in the `default` namespace, and an ExternalSecret can only use a SecretStore in its own namespace,
so this namespace has its own SecretStore. It authenticates as the engine's identity. That identity therefore needs:

- a federated credential for `system:serviceaccount:operator-workflow-engine:operator-workflow-engine`,
- a Postgres role on the server, and
- read access to the Key Vault secret.

## Configuration

`ASPNETCORE_ENVIRONMENT` is the Studio environment, `dev`, `staging` or `prod`, set by each overlay in
[`infra/kustomize`](infra/kustomize). No environment needs settings of its own yet, so there are no per-environment
`appsettings` files. `OperatorCommandSettings` holds its own defaults, which are those of the Studio cluster: the
operator's callback router and the token the Deployment mounts.

The engine's [failure-storm breaker](../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md) stays off. It
keeps one failing app from flooding the engine with retries. Here every step calls the same operator, so when the
operator fails, every namespace fails with it, and the breaker would hold runs back after the operator recovers. Off is
the engine's default, and `appsettings.json` still says so, so that a change of the default does not turn it on here.

The engine keeps a finished workflow for 14 days. A caller can read the status of its run, and find it by its source,
until then.

## Telemetry

The command names the run on the step's span and the workflow's entry span with `altinn.core_operator.domain`,
`altinn.core_operator.caller` and `altinn.core_operator.subject_id`, so the operator can put the same keys on its
spans. Its `OperatorCommand.Execute` span carries the command key. The payload and the state are the operator's own
data, so the host neither logs them nor puts them on telemetry.

## Running locally

`make run` starts PostgreSQL in a container on port 9544 and runs the host on <http://localhost:9090>, with Swagger at
`/swagger` and the engine's dashboard at the root. In `Development` the host calls an operator on
<http://localhost:8090> and sends no token. Point `OperatorCommandSettings__TokenPath` at a file to send one.

`make test` runs the tests. The integration tests start PostgreSQL with Testcontainers, so they need Docker or another
Docker-compatible engine.

## Deployment

[`deploy-core-operator-workflow-engine.yaml`](../../../.github/workflows/deploy-core-operator-workflow-engine.yaml)
builds the image, pins it in the manifests and pushes them as an OCI artifact, which it tags with each environment.
Flux in the Studio cluster applies the artifact from
[`operator-workflow-engine.yaml`](../../../infra/studio/syncroot/base/operator-workflow-engine.yaml).
