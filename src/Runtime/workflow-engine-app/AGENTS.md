# Workflow Engine App

Runtime host for the workflow engine, targeting the Altinn App platform. This is the deployable executable that composes `WorkflowEngine.Core` and its supporting libraries into a running web application.

For core engine documentation, see the [workflow-engine README](../workflow-engine/README.md) and [technical guide](../workflow-engine/docs/technical-guide.md).

## Architecture

- **Thin host**: `WorkflowEngine.App` is a minimal `Program.cs` that calls `AddWorkflowEngine()` and `UseWorkflowEngine()` from `WorkflowEngine.Core` to wire up all services, endpoints, and middleware.
- **Commands**: Registers `AppCommand` (Altinn-specific HTTP callback) via `AddCommand<AppCommand>()`. The built-in `WebhookCommand` is registered automatically by Core.
- **Configuration**: Owns all `appsettings*.json` files — these are runtime concerns, not library concerns.

## Projects

| Project                    | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
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

- `ApiKey` — API key sent to the app
- `CommandEndpoint` — URL template with `{Org}`, `{App}`, `{InstanceOwnerPartyId}`, `{InstanceGuid}` placeholders

## Tests

xUnit v3 test project: `tests/WorkflowEngine.App.Tests/`

Uses `WorkflowEngine.TestKit` from the core project for shared infrastructure:

- `AppTestFixture` extends `EngineAppFixture<Program>` — full integration with PostgreSQL (Testcontainers) and WireMock
- `AppCommandTestFixture` — unit test fixture with mocked HTTP
- `AppTestHelpers` — builders for AppCommand-compatible workflows and steps

Run with `dotnet test`.

## Docker Compose

Includes the core `workflow-engine/docker-compose.yaml` and adds the engine container.

```
docker-compose.yaml          # Profiles: "app" (engine+postgres), "full" (everything)
```

| Container         | Port             | Purpose                                    |
| ----------------- | ---------------- | ------------------------------------------ |
| `workflow-engine` | 8080, 8081       | App runtime (8081 = metrics)               |
| `postgres`        | 5433             | Database                                   |
| `pgadmin`         | 5050             | PostgreSQL admin UI                        |
| `lgtm`            | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `wiremock`        | 6060             | Mock app callbacks                         |

**Deploy engine**: `docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine`

## Code Style

Inherits `Directory.Build.props` with CSharpier formatting enforced at build time.
