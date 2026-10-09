# Local observability stack

The platform observability pipeline on the devenv kind fixture, so the telemetry of a runtime
service you are working on can be queried the way it is in Studio prod. Start it with any of:

```bash
make start-minimal-monitoring      # in src/Runtime/pdf3, src/Runtime/operator or src/Runtime/gateway
make run-monitoring                # in src/Runtime/devenv, without a service
```

The services need no change: their manifests already send OTLP to
`otel-router.runtime-obs.svc.cluster.local:4317`.

## What runs

| Namespace       | Component                                                    | From                                         |
| --------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `otel-operator` | OpenTelemetry Operator                                       | `infra/studio/otel-operator/base`            |
| `observability` | VictoriaMetrics operator                                     | `infra/studio/victoriametrics-operator/base` |
| `runtime-obs`   | `otel-router`, `otel-gateway`                                | `runtime` (the runtime overlay)              |
| `observability` | `observability-proxy`                                        | `studio` (the proxy from the Studio overlay) |
| `observability` | `vmsingle-metrics-a`, `vtsingle-traces-a`, `vlsingle-logs-a` | `victoria`                                   |

devenv pushes `infra/observability` and the two operators as OCI artifacts to the fixture's
registry, builds the proxy from `src/observability-proxy`, and applies Studio's and the runtime's
own syncroot entries through `operators` and `syncroot`, pointed at those artifacts. Flux then
reconciles the overlays in this directory, as it does the real ones in a cluster.

## How it differs from production

- **No Application Insights.** The gateway exports to Victoria only.
- **One cluster plays both sides.** The runtime collectors send to the proxy in the same cluster
  instead of `https://altinn.studio/internal/observability/otlp`.
- **One copy, no agents.** One storage instance per signal, written to by the proxy directly,
  with 1Gi volumes and three days of retention.
- **Fixed tokens.** The collectors ingest with `local-runtime-ingest-token-not-a-secret` and
  queries use `local-grafana-query-token-not-a-secret`.

Everything else is production's: tail sampling (errors, slow traces and 10% of the rest, or
`altinn.studio.sampling=always`), logs at WARN and above, and the metric allowlist
(`altinn*` and `http*`). Telemetry that production drops is missing here as well.

## Querying

Through the proxy, with the query token, on the same paths Grafana uses:

```bash
kubectl -n observability port-forward svc/observability-proxy 18080:80
T='Authorization: Bearer local-grafana-query-token-not-a-secret'
P=http://127.0.0.1:18080/internal/observability
curl -H "$T" "$P/metrics/api/v1/label/service.name/values"
curl -H "$T" -G "$P/traces/api/search" --data-urlencode 'q={resource.service.name="operator"}'
curl -H "$T" "$P/logs/select/logsql/query" --data-urlencode 'query=service.name:pdf3-worker'
```
