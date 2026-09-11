# Workflow Engine App

@../workflow-engine/AGENTS.md

Runtime host for the workflow engine, targeting the Altinn App platform. This is the deployable executable that composes `WorkflowEngine.Core` and its supporting libraries into a running web application.

Core conventions (architecture, command pattern, code style, tests, dashboard) are inherited from the import above. This file covers only what's app-specific. For deeper core documentation, see the [technical guide](../workflow-engine/docs/technical-guide.md).

## Architecture

- **Thin host**: `WorkflowEngine.App` is a minimal `Program.cs` that calls `AddWorkflowEngine()` and `UseWorkflowEngine()` from `WorkflowEngine.Core` to wire up all services, endpoints, and middleware.
- **Commands**: Registers `AppCommand` (Altinn-specific HTTP callback) via `AddCommand<AppCommand>()`. The built-in `WebhookCommand` is registered automatically by Core.
- **Configuration**: Owns all `appsettings*.json` files — these are runtime concerns, not library concerns.

## Projects

| Project                    | Purpose                                                        |
|----------------------------|----------------------------------------------------------------|
| `WorkflowEngine.App`       | Web host: `Program.cs`, config files, Dockerfile               |
| `WorkflowEngine.App.Tests` | Unit + integration tests for AppCommand, config, enqueue flows |

Dependencies (from `workflow-engine/`):

- `WorkflowEngine.Core` — engine services, endpoints, built-in WebhookCommand
- `WorkflowEngine.TestKit` — reusable test infrastructure (used by `App.Tests`)

## AppCommand

The Altinn-specific command that calls back into Altinn apps via HTTP POST.

- **Type string**: `"app"`
- **Data**: `AppCommandData` — `{ commandKey, payload? }`
- **Context**: `AppWorkflowContext` — `{ actor, org, app, instanceOwnerPartyId, instanceGuid, callbackToken }`. `callbackToken` is opaque to the engine and replayed on every callback in the `Authorization: Bearer` header for authentication.
- **Endpoint**: Templated URL expanded from context, e.g. `http://host/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks`
- **State passing**: Reads `{ "state": "..." }` from response body, passes forward to next step
- **Execution reference time**: Sends required `executionReferenceTime` as `Workflow.StartAt ?? Step.CreatedAt`
- **Mailbox rendezvous**: On a receive workflow's first step the callback carries a `mailbox` block — `{ id, seq, delivery?, disposedReason? }` — projected verbatim from what the engine's executor read. `delivery` and `disposedReason` are exclusive: exactly one is present, and an absent `delivery` means the mailbox is closed and no message will ever reach this step. `null` on every other callback.
- **Validation**: All context fields validated at enqueue time — invalid requests never enter the queue
- **Error classification**: 4xx (except 408/418/429) → critical, 5xx/408/418/429 → retryable

Configuration via `appsettings.json` under `AppCommandSettings`:

- `CommandEndpoint` — URL template with `{Org}`, `{App}`, `{InstanceOwnerPartyId}`, `{InstanceGuid}` placeholders

## Namespace circuit breaker

The engine library ships the failure-storm breaker dark (`ThrottlingSettings.Enabled` defaults to
`false`). **This host opts in**, in `appsettings.json` under `EngineSettings.Throttling`, so every
deployment that runs this image has it on. The knobs are spelled out at the values the
[failure-throttling ADR](../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md)
documents rather than left implicit, because they are what an operator reaches for first.

Two consequences worth holding on to:

- **It is restart-only.** The flag is read once at repository construction and once when the sweep
  service starts, so turning it off is a rollout, not a config reload. The per-namespace override
  endpoints are the in-flight lever; they answer `409 Conflict` when the flag is off.
- **A per-environment override is the kill switch.** An `appsettings.<environment>.json` (the
  deployed `ASPNETCORE_ENVIRONMENT` is the environment name — `at23`, `tt02`, `prod`) or an
  `EngineSettings__Throttling__Enabled` env var in that environment's kustomize overlay turns it
  back off for that environment alone.

## Tests

xUnit v3 test project: `tests/WorkflowEngine.App.Tests/`

Uses `WorkflowEngine.TestKit` from the core project for shared infrastructure:

- `AppTestFixture` extends `EngineAppFixture<Program>` — full integration with PostgreSQL (Testcontainers) and WireMock
- `AppCommandTestFixture` — unit test fixture with mocked HTTP
- `AppTestHelpers` — builders for AppCommand-compatible workflows and steps

Run with `dotnet test`.

## Local Harness

Use `studioctl env up --dev-workflow-engine` to start localtest with the workflow-engine route bound to the host, then run `dotnet run --project src/WorkflowEngine.App`.

| Service           | Port       | Purpose                      |
|-------------------|------------|------------------------------|
| `workflow-engine` | 9090       | Host app runtime             |

The app project does not own a Docker Compose harness.
