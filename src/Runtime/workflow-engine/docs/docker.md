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

**Observability playground, throttling on and short windows (see [`.k6/README.md`](../.k6/README.md#perpetual-mixjs)):**

```bash
make playground       # full stack, the engine in a container; make playground-stop takes it down
make playground-host  # dependencies, then the engine on the host until Ctrl+C; make stop afterwards
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

The stack has no monitoring of its own. The engine exports its telemetry over OTLP to a collector on
the host, and any collector listening on port 4317 receives it. An engine on the host exports to the
SDK's default, `http://localhost:4317`. `workflow-engine-testapp` exports to
`OTEL_EXPORTER_OTLP_ENDPOINT` from the shell that starts the stack, `http://host.docker.internal:4317`
when that is unset. When nothing listens there, the exporter fails quietly and the engine runs on.
Docker Engine on Linux does not route `host.docker.internal` to the host's loopback, where a collector
is usually published, so there only an engine on the host reaches it unless you point the variable
elsewhere. For the observability playground, that is `make playground-host`.

The engine dashboard links each workflow to its trace in Grafana only once the engine is told which
Grafana: `EngineSettings__Dashboard__GrafanaUrl`, the Grafana a browser opens, and
`EngineSettings__Dashboard__GrafanaTracesDatasourceUid`, the Tempo datasource holding the traces.
Both are unset by default, and the dashboard then draws no trace links. `workflow-engine-testapp`
takes them from the shell that starts the stack, and an engine on the host from its own environment.

For example, `studioctl env up --monitoring` publishes an OpenTelemetry collector on the host's ports
4317 and 4318 and serves Grafana at <http://local.altinn.cloud:8000/grafana>, where the _Workflow
Engine_ dashboard is in the _Altinn Studio_ folder. Pick the service on the dashboard:
`workflow-engine-testapp` for the TestApp, in this stack or on the host, and `workflow-engine-app`
for the App host, on the host or in studioctl's environment. To give the TestApp's dashboard trace
links into that Grafana, set the two settings before starting it:

```bash
export EngineSettings__Dashboard__GrafanaUrl=http://local.altinn.cloud:8000/grafana
export EngineSettings__Dashboard__GrafanaTracesDatasourceUid=altinn-studio-traces
make run            # or dotnet run --project tests/WorkflowEngine.TestApp
```

studioctl sets the same two on the engine it runs, and `workflow-engine-app`'s launch profiles set
them for the App host on the host.

This stack and studioctl's environment publish no host port in common as long as studioctl runs
without `--dev-workflow-engine`. That flag publishes studioctl's engine database on port 9543, which
this stack's `postgres` holds, and routes the environment's engine traffic to port 9090 on the host,
where the `core` profile's engine listens, as does a TestApp on the host. Use one or the other.

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
