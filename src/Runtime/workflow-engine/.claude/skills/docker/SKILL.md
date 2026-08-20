---
name: docker
description: Manage the workflow engine's Docker Compose stack. Use when starting, stopping, rebuilding containers, or resetting the database.
---

Everything below runs from `src/Runtime/workflow-engine/`. The `Makefile` wraps the compose
invocations and is kept in step with `docker-compose.yaml` — prefer it, and drop to raw
`docker compose` only for something it does not wrap.

## Profiles

There is exactly one profile. Without it, compose starts the supporting services only, which is what
local engine development wants: the engine runs on the host against them.

| Profile  | Services                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| _(none)_ | `postgres`, `pgadmin`, `lgtm`, `wiremock`, `blackbox-exporter`, `postgres-exporter` |
| `core`   | the above plus `workflow-engine-testapp` — an engine host built from this folder    |

## Common commands

**Dependencies only, engine on the host:**

```bash
make dev            # docker compose up -d
dotnet run --project ../workflow-engine-app/src/WorkflowEngine.App
```

**Full stack in Docker (rebuilds the engine image):**

```bash
make run            # docker compose --profile core up -d --build
```

**Stop everything:**

```bash
make stop           # docker compose --profile core down
```

**Stop and delete the database volume:**

```bash
make reset          # down, then docker volume rm workflow-engine_postgres_data
```

**Container status and logs:**

```bash
docker compose ps
docker compose logs -f <service-name>
```

## Container reference

| Container                 | Port(s)          | Purpose                                    |
| ------------------------- | ---------------- | ------------------------------------------ |
| `workflow-engine-testapp` | 9090             | Engine host (`core` profile only)          |
| `postgres`                | 9543             | Database (`workflow_engine`, `postgres`)   |
| `pgadmin`                 | 5050             | PostgreSQL admin UI                        |
| `lgtm`                    | 7070, 4317, 4318 | Grafana + Prometheus + Loki + Tempo + OTLP |
| `blackbox-exporter`       | —                | Prometheus blackbox exporter               |
| `postgres-exporter`       | 9187             | Prometheus PostgreSQL exporter             |
| `wiremock`                | 6060             | Mock app callbacks                         |

The dashboard is served by the engine host itself, at the root — <http://localhost:9090/> when the
`core` profile is up.

## Database reset

Truncating is faster than recreating the volume and keeps the schema and migration history. It needs
a running `postgres` container:

```bash
docker compose exec postgres psql -U postgres -d workflow_engine -c \
  'TRUNCATE engine.workflows, engine.steps, engine.workflow_collections, engine.idempotency_keys,
            engine.mailboxes, engine.mailbox_deliveries, engine.mailbox_receivers CASCADE;'
```

`make reset` is the heavier hammer: it deletes the volume, so the next start re-runs every migration.

## Notes

- Tests do **not** use this stack. Integration and repository tests start their own PostgreSQL and
  WireMock through Testcontainers, so `dotnet test` needs nothing running beyond Docker itself.
- `workflow-engine-testapp` bind-mounts `src/WorkflowEngine.Core/wwwroot` read-only and runs with
  `ASPNETCORE_ENVIRONMENT=Docker`, which serves the dashboard from disk — edit a dashboard file and
  refresh, no rebuild. C# changes still need `make run` to rebuild the image.
