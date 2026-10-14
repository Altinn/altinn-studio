# Docker Compose stack

Everything below runs from `src/Runtime/workflow-engine/`. The `Makefile` wraps the compose
invocations and is kept in step with `docker-compose.yaml` — prefer it, and drop to raw
`docker compose` only for something it does not wrap.

## Profiles

There is exactly one profile. Without it, compose starts the supporting services only, which is what
local engine development wants: the engine runs on the host against them.

| Profile  | Services                                                                         |
| -------- | -------------------------------------------------------------------------------- |
| _(none)_ | `postgres`, `pgadmin`, `wiremock`                                                |
| `core`   | the above plus `workflow-engine-testapp` — an engine host built from this folder |

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

| Container                 | Port(s) | Purpose                                  |
| ------------------------- | ------- | ---------------------------------------- |
| `workflow-engine-testapp` | 9090    | Engine host (`core` profile only)        |
| `postgres`                | 9543    | Database (`workflow_engine`, `postgres`) |
| `pgadmin`                 | 5050    | PostgreSQL admin UI                      |
| `wiremock`                | 6060    | Mock app callbacks                       |

The dashboard is served by the engine host itself, at the root — <http://localhost:9090/> when the
`core` profile is up.

## Monitoring

The stack has no monitoring of its own. Telemetry goes to studioctl's:
`studioctl env up --monitoring` publishes an OpenTelemetry collector on the host's ports 4317 and
4318 and serves Grafana at <http://local.altinn.cloud:8000/grafana>, where the _Workflow Engine_
dashboard is in the _Altinn Studio_ folder. Pick the service on the dashboard:
`workflow-engine-testapp` for the TestApp, in this stack or on the host, and `workflow-engine-app`
for the App host, on the host or in studioctl's environment.

An engine on the host exports to the SDK's default, `http://localhost:4317`, which is the collector.
`workflow-engine-testapp` exports to `http://host.docker.internal:4317`. When nothing listens there,
the exporter fails quietly and the engine runs on. Docker Engine on Linux does not route
`host.docker.internal` to the host's loopback, where the collector is published, so there only an
engine on the host reaches it.

This stack and studioctl's environment publish no host port in common as long as studioctl runs
without `--dev-workflow-engine`. That flag publishes studioctl's engine database on port 9543, which
this stack's `postgres` holds, and routes the environment's engine traffic to port 9090 on the host,
where the `core` profile's engine listens. Use one or the other.

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
