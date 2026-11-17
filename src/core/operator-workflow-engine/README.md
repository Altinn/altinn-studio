# operator-workflow-engine

The operator-workflow-engine hosts the [workflow engine](../../Runtime/workflow-engine/README.md) for the
[core operator](../operator/README.md). It adds one command, `OperatorCommand`, which runs a step by calling the
operator. It runs in the Studio cluster, and the operator is its only client.

The operator runs as one replica and keeps nothing of a run itself. The engine keeps each run as a workflow, so a run
survives a restart of the operator. The engine also gives the operator retries, deferrals, wait budgets, cancellation
and idempotent creates, so the operator has no retry or timer code of its own.
[A run, step by step](../operator/README.md#a-run-step-by-step) describes the steps.

This host has its own database, so the operator's runs never share a queue with app workflows. The
[Altinn app host](../../Runtime/workflow-engine-app/README.md) serves the apps.

## How a step reaches the operator

For each attempt of a step, the command posts the callback payload to `OperatorCommandSettings.CommandEndpoint`
followed by the step's command key, such as `run.admit`. The operator answers with the step's outcome, as the
[callback contract](../operator/README.md#callback-contract) describes:

- A 422 problem ends the step. The step keeps the problem as its error as it is.
- A status code in the step's `NonRetryableHttpStatusCodes` also ends the step, as for the engine's `WebhookCommand`.
- The engine retries the step after other answers, such as 503.

The examples in [`api/callbacks`](../operator/api/callbacks) are the contract. The tests of both sides read them, so
change them together with both sides.

The command sends a projected ServiceAccount token with the audience `operator`. The operator checks it as
[Identities](../operator/README.md#identities) describes. The engine's own API has no authentication, so its
NetworkPolicy lets only the operator's pods reach it.

## The database

The engine stores workflows in its own database on the existing Studio PostgreSQL server in each environment.
altinn-studio-infra provisions the database. The host's role owns the database, because the engine's migrations create
the schema `engine` at startup. The role has no access to the server's other databases.

The host connects directly on port 5432, not through a transaction pooler such as PgBouncer. The engine keeps a
`LISTEN` connection and takes session advisory locks, and transaction pooling breaks both.

The host logs in as its Entra identity, the workload identity of the `operator-workflow-engine` ServiceAccount.
The connection string has no password, so the engine fetches an Entra token and refreshes it before it expires:

```text
Host=<server>.postgres.database.azure.com;Port=5432;Database=<database>;Username=<role of the Entra identity>;Ssl Mode=VerifyFull;GSS Encryption Mode=Disable
```

The Key Vault secret `operator-workflow-engine-connection-string` in the Studio Key Vault holds the connection
string, and [secrets.yaml](infra/kustomize/base/secrets.yaml) gives it to the host. The identity needs:

- a federated credential for `system:serviceaccount:operator-workflow-engine:operator-workflow-engine`
- a Postgres role that owns the database
- read access to the Key Vault secret

## Configuration

`ASPNETCORE_ENVIRONMENT` is the Studio environment, `dev` or `prod`. No environment has settings of its own yet, so
there are no per-environment `appsettings` files.

The engine's [failure-storm throttling](../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md) stays off.
It keeps one failing app from flooding the engine with retries. Here every step calls the same operator, so all
namespaces fail together, and the throttling would hold runs back after the operator recovers. `appsettings.json` turns
it off, so a change of the engine's default does not turn it on here.

The engine keeps a finished workflow for 14 days. Until then, a caller can read the run's status and find the run by
its labels.

## Telemetry

The host is a process of the core operator, so its attributes use the operator's names under `altinn.core_operator.`.
The operator sets the same keys on its spans, so one search finds a run in both.
[`OperatorTelemetryAttributes`](src/WorkflowEngine.Operator/Commands/OperatorCommand/OperatorTelemetryAttributes.cs)
lists them. The step's state is the operator's own data, so the host keeps it out of logs and telemetry.

## Running locally

`make run` starts PostgreSQL in a container and runs the host on <http://localhost:9090>, with Swagger at `/swagger`
and the engine's dashboard at the root. In `Development` the host calls an operator on <http://localhost:8090> without
a token. Set `OperatorCommandSettings__TokenPath` to a token file to send one.

`make test` runs the tests. The integration tests start PostgreSQL with Testcontainers, so they need Docker or Podman.
The core operator's [`make test-integration`](../operator/README.md#develop) runs this host with the operator. CI runs
it when either side or the engine library changes.

## Deployment

[`deploy-core-operator-workflow-engine.yaml`](../../../.github/workflows/deploy-core-operator-workflow-engine.yaml)
builds the image, pins it in the manifests and pushes them as an OCI artifact, tagged with each environment. Flux in
the Studio clusters of dev and prod deploys it as `operator-workflow-engine`, from
[`operator-workflow-engine.yaml`](../../../infra/studio/syncroot/base/operator-workflow-engine.yaml).
