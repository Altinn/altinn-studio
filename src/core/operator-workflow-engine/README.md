# operator-workflow-engine

The operator-workflow-engine hosts the [workflow engine](../../Runtime/workflow-engine/README.md) for the
[core operator](../operator/README.md) in the Studio cluster. The engine keeps each run as a workflow, so a run
survives a restart of the operator. It also gives the operator retries, deferrals, wait budgets, cancellation and
idempotent creates. [A run, step by step](../operator/README.md#a-run-step-by-step) describes the steps. The host has
its own database, so runs never share a queue with app workflows.

## How a step reaches the operator

For each attempt of a step, `OperatorCommand` posts the callback payload to `OperatorCommandSettings.CommandEndpoint`
followed by the step's command key, such as `run.admit`. It sends a projected ServiceAccount token with the audience
`operator`. The operator answers as the [callback contract](../operator/README.md#callback-contract) describes:

- A 422 problem ends the step, and the step keeps the problem as its error.
- A status code in the step's `NonRetryableHttpStatusCodes` also ends the step, as for the engine's `WebhookCommand`.
- The engine retries the step after other answers, such as 503.

The tests of both sides read the examples in [`api/callbacks`](../operator/api/callbacks), so change them together.
The engine's own API has no authentication, so its NetworkPolicy lets only the operator's pods reach it.

## The database

The engine stores workflows in the database `operator_workflow_engine` on the Studio PostgreSQL server of each
environment. altinn-studio-infra provisions it. The host's role owns the database, because the engine's migrations
create the schema `engine` at startup. The role has no access to the server's other databases. The host connects
directly on port 5432. The engine keeps a `LISTEN` connection and takes session advisory locks, and a transaction
pooler such as PgBouncer breaks both.

The host logs in as the Entra identity of its ServiceAccount. The connection string in
[deployment.yaml](infra/kustomize/base/deployment.yaml) has no password, so the engine fetches and refreshes an Entra
token, and the host needs no secret. altinn-studio-infra sets the server and the role in Flux variables.

## Configuration

`appsettings.json` turns off the engine's
[failure-storm throttling](../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md). Every step calls the
same operator, so all namespaces fail together, and the throttling would hold runs back after the operator recovers.

The engine keeps a finished workflow for 14 days. Until then, a caller can read the run and find it by its labels.

## Telemetry

The host's attributes use the core operator's names under `altinn.core_operator.`, so one search finds a run in both.
[`OperatorTelemetryAttributes`](src/WorkflowEngine.Operator/Commands/OperatorCommand/OperatorTelemetryAttributes.cs)
lists them. The step's state is the operator's data, so the host keeps it out of logs and telemetry.

## Running locally

`make run` starts PostgreSQL in a container and runs the host on <http://localhost:9090>, with Swagger at `/swagger`
and the engine's dashboard at the root. In `Development` the host calls an operator on <http://localhost:8090> without
a token. Set `OperatorCommandSettings__TokenPath` to a token file to send one. `make test` runs the command's tests.
The core operator's [`make test-integration`](../operator/README.md#develop) runs this host with the real operator.

## Deployment

[`deploy-core-operator-workflow-engine.yaml`](../../../.github/workflows/deploy-core-operator-workflow-engine.yaml)
pushes the image and the manifests, and Flux deploys them to dev and prod from
[`operator-workflow-engine.yaml`](../../../infra/studio/syncroot/base/operator-workflow-engine.yaml).
