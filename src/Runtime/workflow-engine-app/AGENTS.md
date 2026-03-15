# Workflow Engine App

Runtime host for the workflow engine, targeting the Altinn App platform. This is the deployable executable that composes `WorkflowEngine.Core` and its supporting libraries into a running web application.

## Architecture

- **Thin host**: `WorkflowEngine.App` is a minimal `Program.cs` that calls extension methods from `WorkflowEngine.Core` to wire up all services, endpoints, and middleware.
- **Command handlers**: Explicitly registers `AppCommandHandler` and `WebhookCommandHandler` (no config-driven discovery).
- **Configuration**: Owns all `appsettings*.json` files — these are runtime concerns, not library concerns.

## Projects

| Project              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| `WorkflowEngine.App` | Web host: `Program.cs`, config files, Dockerfile            |

Dependencies (from `workflow-engine/`):
- `WorkflowEngine.Core` — engine services, endpoints, auth
- `WorkflowEngine.CommandHandlers` — App and Webhook command handlers
- `WorkflowEngine.Data` — database persistence
- `WorkflowEngine.Telemetry` — OpenTelemetry instrumentation
- `Altinn.Studio.Runtime.Common` — shared hosting configuration

## Docker Compose

```
docker-compose.yaml          # Profiles: "app" (engine+postgres), "full" (everything)
```

| Container           | Port             | Purpose                                             |
|---------------------|------------------|-----------------------------------------------------|
| `workflow-engine`   | 8080, 8081       | App runtime                                         |
| `postgres`          | 5432             | Database                                            |
| `pgadmin`           | 5050             | PostgreSQL admin UI                                 |
| `lgtm`              | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP          |
| `wiremock`          | 6060             | Mock app callbacks                                  |

**Deploy engine**: `docker compose build workflow-engine && docker compose --profile app up -d --no-deps workflow-engine`

## Code Style

Inherits `Directory.Build.props` with CSharpier formatting enforced at build time.
