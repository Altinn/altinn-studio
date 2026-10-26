# Local observability stack

The platform observability pipeline on the devenv kind fixture, so you can query the telemetry of a runtime service
you work on the way it is queried in Studio prod. Start it with `make start-minimal-monitoring` in
`src/Runtime/pdf3`, `src/Runtime/operator` or `src/Runtime/gateway`, or with `make run-monitoring` in
`src/Runtime/devenv` without a service. The services need no change, since their manifests already send OTLP to
`otel-router.runtime-obs.svc.cluster.local:4317`.

devenv publishes the overlays in this directory, the operators and the [observability proxy](../../../src/observability-proxy)
to the fixture's registry, and applies Studio's and the runtime's syncroot entries pointed at them. Flux then
reconciles them as it does in a real cluster.

## How it differs from production

- The gateway exports only to Victoria, not to Application Insights.
- One cluster plays both sides. The runtime collectors send to the proxy in the same cluster instead of
  `https://altinn.studio/internal/observability/otlp`.
- The proxy writes to one storage instance per signal, with small volumes and three days of retention, and there is
  no self-monitoring.
- The collectors ingest with `local-runtime-ingest-token-not-a-secret`, and queries use
  `local-grafana-query-token-not-a-secret`.

The rest is production's, such as tail sampling, the log level and the metric allowlist. Telemetry that production
drops is missing here as well.

## Grafana

Grafana runs in the `grafana` namespace, at the version of the shared Grafana at grafana.dis.altinn.cloud, with
Studio's datasources, folder and dashboards from
[`Altinn/altinn-dashboards-grafana`](https://github.com/Altinn/altinn-dashboards-grafana) (`products/studio`). The
datasources keep their names and uids and query this proxy, so a dashboard built here works there unchanged. devenv
leaves out a datasource that does not query the proxy, with a warning.

devenv clones the dashboards repository into the fixture's cache and updates it on every start. To work on
dashboards in your own checkout, set `DEVENV_DASHBOARDS_REPOSITORY` to it and start the stack again after each change.
To add a dashboard to the shared Grafana, build it here in the Altinn Studio folder and export its JSON into that
repository, as its README describes. Grafana loses changes made in its UI when the pod restarts.

The fixture's ingress listens on every host interface, so it does not expose Grafana, which lets anyone in as an
admin, or its MCP server, which can change dashboards. Reach them with `kubectl port-forward` on
`svc/grafana` in the `grafana` namespace, and on `deploy/grafana-mcp` at port 8000 with the path `/mcp`.

## Querying

Query through the proxy with the query token, on the paths Grafana uses:

```bash
kubectl -n observability port-forward svc/observability-proxy 18080:80
T='Authorization: Bearer local-grafana-query-token-not-a-secret'
P=http://127.0.0.1:18080/internal/observability
curl -H "$T" "$P/metrics/api/v1/label/service.name/values"
curl -H "$T" -G "$P/traces/api/search" --data-urlencode 'q={resource.service.name="operator"}'
curl -H "$T" "$P/logs/select/logsql/query" --data-urlencode 'query=service.name:pdf3-worker'
```

VictoriaTraces' LogsQL API, at `$P/traces-logsql`, also holds a trace index row per trace, whose `duration` is the
whole trace's. Filter on a span field, such as `name:*`, before `stats count()` or `quantile(0.95, duration)`, or the
index rows are counted too.
