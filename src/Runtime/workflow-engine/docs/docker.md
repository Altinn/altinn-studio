# Docker Compose stack

The [Makefile](../Makefile) wraps the [compose file](../docker-compose.yaml), and `make help` lists its targets. Run
them from `src/Runtime/workflow-engine`.

Without a profile, compose starts only PostgreSQL, PgAdmin and WireMock, for an engine on the host. The `core` profile
adds `workflow-engine-testapp`, the TestApp built from this folder. It mounts the dashboard's files from
`src/WorkflowEngine.Core/wwwroot` and runs with `ASPNETCORE_ENVIRONMENT=Docker`, which serves them from disk, so a
dashboard edit shows on reload. A C# change needs `make run` to rebuild the image.

`make reset` deletes the database volume, so the next start runs every migration again.

`make playground` and `make playground-host` run the observability playground, which the
[load tests](../.k6/README.md#perpetual-mixjs) describe.

## Monitoring

The stack has no monitoring of its own. The engine exports its telemetry over OTLP only when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set, and the exporter fails quietly when nothing listens there. An engine on the host
takes the variable from the shell that starts it, since the launch profiles do not set it, and `make playground-host`
uses `http://localhost:4317` when the shell has none. `workflow-engine-testapp` uses the variable from the shell that
starts the stack, or `http://host.docker.internal:4317`. Docker Engine on Linux does not route `host.docker.internal` to the
host's loopback, where a collector is usually published, so there run the engine on the host.

`studioctl env up --monitoring` runs such a collector, and Grafana at `http://local.altinn.cloud:8000/grafana` with
the _Workflow Engine_ dashboard in the _Altinn Studio_ folder. Pick the service `workflow-engine-testapp` for the
TestApp and `workflow-engine-app` for the App host.

The engine's dashboard links a workflow to its trace only when the host names a trace viewer, as
[Dashboard trace links](technical-guide.md#dashboard-trace-links) describes. studioctl and the App host's launch
profiles set the Grafana pair. For the TestApp, export it before you start the stack:

```bash
export EngineSettings__Dashboard__GrafanaUrl=http://local.altinn.cloud:8000/grafana
export EngineSettings__Dashboard__GrafanaTracesDatasourceUid=altinn-studio-traces
```

Do not run this stack beside `studioctl env up --dev-workflow-engine`. That flag publishes studioctl's engine
database on port 9543, where this stack's PostgreSQL listens, and routes the environment's engine traffic to port
9090 on the host, where the TestApp listens.
