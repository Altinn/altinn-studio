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
- **Context**: `AppWorkflowContext` — `{ actor, lockToken, org, app, instanceOwnerPartyId, instanceGuid }`
- **Endpoint**: Templated URL expanded from context, e.g. `http://host/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks`
- **State passing**: Reads `{ "state": "..." }` from response body, passes forward to next step
- **Validation**: All context fields validated at enqueue time — invalid requests never enter the queue
- **Error classification**: 4xx (except 408/418/429) → critical, 5xx/408/418/429 → retryable

Configuration via `appsettings.json` under `AppCommandSettings`:

- `CommandEndpoint` — URL template with `{Org}`, `{App}`, `{InstanceOwnerPartyId}`, `{InstanceGuid}` placeholders

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
