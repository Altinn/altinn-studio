# Workflow Engine App

The Workflow Engine App hosts the [workflow engine](../workflow-engine/README.md) for Altinn apps. It composes the
engine library and adds `AppCommand`, which runs a step by calling back to the app. Apps enqueue their work through
the [app backend's integration](../../App/backend/src/Altinn.App.Core/Internal/WorkflowEngine). The
[technical guide](../workflow-engine/docs/technical-guide.md#the-app-layer-workflowengineapp) describes `AppCommand`
and how the app authenticates its callbacks.

The engine owns the wire contract with the app backend. [The contract tests](tests/WorkflowEngine.App.Tests/Contract/README.md)
keep the app's copies of the models from drifting.

## Where it runs

The runtime clusters of at23 and tt02 run it, from their syncroots in [`infra/runtime/syncroot`](../../../infra/runtime/syncroot).
The [kustomize overlays](infra/kustomize) also cover at22, at24, yt01 and prod, but no syncroot deploys it there
yet.

The local environment runs the build deployed to tt02, with the configuration studioctl supplies. A change to that
configuration must keep older studioctl versions working, as
[Images the local environment runs](../README.md#images-the-local-environment-runs) explains.

## Configuration

`ASPNETCORE_ENVIRONMENT` holds the environment name, such as `at23` or `tt02`, not an ASP.NET Core environment. The
deployment reads it from the `runtime-environment` ConfigMap. An app in the same cluster gets `Staging` or
`Production` from [apps-config](../../../infra/runtime/apps-config) instead. So a per-environment file here is
`appsettings.at23.json`, and nothing would load an `appsettings.Staging.json`.

The files for at23, tt02 and prod set nothing yet. They stay because that is where the next person will look. Keep
them plain JSON without comments: .NET accepts comments, but `jq` and other tools do not.

### Namespace circuit breaker

The engine ships the [failure-storm breaker](../../../docs/adr/2026-08-13-workflow-engine-failure-throttling.md) off,
and this host turns it on with `EngineSettings.Throttling.Enabled` in `appsettings.json`. It sets only that flag, since
a setting equal to its default would hide a typo in its key. The engine reads the flag at startup, so turning the
breaker off in an environment takes a rollout with `EngineSettings__Throttling__Enabled` in its overlay or
`appsettings` file. While the flag is off, the per-namespace override endpoints answer `409 Conflict`. No test pins
the flag, since a test could check only the base file, not the value an environment gets. So removing the setting
turns the breaker off silently: the engine logs that at `Debug`, below this host's log level.

## Telemetry

Telemetry has no key for the instance owner's party ID or the actor. The team's observability standard has not
decided whether they may go on telemetry, so add neither until it does. The party ID still reaches telemetry in the
callback URL's path, which the HttpClient span records as `url.full`, and in the _Sending AppCommand_ log. Both wait
for the same decision.

## Running locally

`make run` starts localtest with its workflow engine route pointed at this host, then runs the host. To see the
host's traces, metrics and logs in Grafana, run `studioctl env up --dev-workflow-engine --monitoring` and
`dotnet run --project src/WorkflowEngine.App` instead, with `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` in the
shell. The launch profiles do not set it, and without it the host exports nothing. Grafana shows them on the _Workflow Engine_ dashboard, under
the service `workflow-engine-app`.

| Service    | URL                                            | Notes                       |
| ---------- | ---------------------------------------------- | --------------------------- |
| Engine API | http://localhost:9090                          | Swagger UI at `/swagger`    |
| Dashboard  | http://localhost:9090                          | At the root                 |
| Localtest  | http://local.altinn.cloud:8000                 | Platform and app callbacks  |
| PostgreSQL | localhost:9543                                 | Localtest workflow database |
| Public API | http://workflow-engine.local.altinn.cloud:8000 | Proxied through localtest   |
| Grafana    | http://local.altinn.cloud:8000/grafana         | With `--monitoring`         |

The [load tests](.k6/README.md) run against the host that `make run` starts.
