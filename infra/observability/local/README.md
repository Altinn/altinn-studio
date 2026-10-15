# Local observability stack

The platform observability pipeline on the devenv kind fixture, so the telemetry of a runtime
service you are working on can be queried the way it is in Studio prod. Start it with any of:

```bash
make start-minimal-monitoring      # in src/Runtime/pdf3, src/Runtime/operator or src/Runtime/gateway
make run-monitoring                # in src/Runtime/devenv, without a service
make run-monitoring-full           # in src/Runtime/devenv: production's backend and the alert rules
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

That is the light profile, the default. The full profile (`--monitoring-profile full`) reconciles
`syncroot-full`, `studio-full` and `victoria-full` instead: production's backend, with the agents
(`vmagent-metrics`, `vlagent-logs`, `vtagent-traces`), the `-b` storage copies, `vmagent-self`,
and two proxy replicas writing to the agents. It needs the standard variant, whose three workers
are in different zones, so the copies and replicas keep production's zone anti-affinity.
`studio-common` holds what both profiles change in the Studio overlay.

devenv pushes `infra/observability` and the two operators as OCI artifacts to the fixture's
registry, builds the proxy from `src/observability-proxy`, and applies Studio's and the runtime's
own syncroot entries through `operators` and `syncroot`, pointed at those artifacts. Flux then
reconciles the overlays in this directory, as it does the real ones in a cluster.

## How it differs from production

- **No Application Insights.** The gateway exports to Victoria only.
- **One cluster plays both sides.** The runtime collectors send to the proxy in the same cluster
  instead of `https://altinn.studio/internal/observability/otlp`.
- **One copy, no agents** in the light profile. One storage instance per signal, written to by
  the proxy directly, with 1Gi volumes and three days of retention. The full profile keeps the
  agents and both copies, with the same volumes and retention and 1GiB agent queues.
- **No self-monitoring** in the light profile. The scraper of the stack's own metrics,
  `vmagent-self`, runs only in the full profile.
- **No node pools.** The observability node selectors and tolerations are left out; the zones
  of the standard variant's workers stand in for them.
- **Fixed tokens.** The collectors ingest with `local-runtime-ingest-token-not-a-secret` and
  queries use `local-grafana-query-token-not-a-secret`.

Everything else is production's: tail sampling (errors, slow traces and 10% of the rest, or
`altinn.studio.sampling=always`), logs at WARN and above, and the metric allowlist
(`altinn*` and `http*`). Telemetry that production drops is missing here as well.

## Grafana

A Grafana 12.4.8, the version of the shared Grafana at grafana.dis.altinn.cloud, runs in the
`grafana` namespace with Studio's resources from
[`Altinn/altinn-dashboards-grafana`](https://github.com/Altinn/altinn-dashboards-grafana)
(`products/studio`). As in the shared Grafana, grafana-operator, at the platform's version, syncs
them into it: devenv registers the local Grafana as the operator's external instance
`external-grafana`, renders each kustomization in the product directory, and Flux applies the result
from the fixture's registry (the `grafana-content` Kustomization in `grafana`). Folders, including
nested ones such as `Altinn Studio/Observability`, dashboards and datasources keep their names, UIDs
and links, so a dashboard built here works there unchanged. In the full profile the alert rules and
contact points are synced too.

What differs is what the shared Grafana's cluster provides:

- **Datasource URLs.** The datasources query this proxy in the cluster instead of
  `https://altinn.studio/internal/observability/`. A datasource that does not query the proxy is
  left out with a warning.
- **Secrets.** Resources that only the platform has, such as the ExternalSecrets, are left out.
  devenv creates the Secrets they would fill: the datasources' with the local query token, and
  `grafana-slack-webhooks` with every key a contact point reads pointing to `alert-recorder` in the
  `grafana` namespace, which keeps the notifications and shows them as Slack messages.
- **Resync.** The operator syncs a resource every minute instead of every 10 minutes, unless the
  resource sets its own period, so content comes back soon after Grafana restarts with an empty
  database. A changed resource is synced at once.

Without a checkout, devenv clones the repository into the fixture's cache, updates it on every
start, and uses the cached copy when it cannot. To work on dashboards or alert rules in your own
checkout, point devenv at it:

```bash
export DEVENV_DASHBOARDS_REPOSITORY=~/code/altinn-dashboards-grafana
make start-minimal-monitoring      # again, after changing the checkout
```

Grafana, its MCP server and the recorder are not exposed through the fixture's ingress, which
listens on every host interface: Grafana lets anyone in as an admin, and the MCP server can change
dashboards. Reach them on localhost:

```bash
kubectl -n grafana port-forward svc/grafana 3000:80              # http://localhost:3000
kubectl -n grafana port-forward deploy/grafana-mcp 8000:8000     # MCP, only on local port 8000
claude mcp add --transport http grafana-local http://localhost:8000/mcp
kubectl -n grafana port-forward svc/alert-recorder 8081:80       # full profile, http://localhost:8081
```

To add a dashboard to the shared Grafana, build it here in the Altinn Studio folder, export its
JSON into `products/studio/dashboards/` in the dashboards repository with its `GrafanaDashboard`
resource (see that repository's README), and start the fixture again to see the operator sync it.
Changes made in the Grafana UI are lost when the pod restarts.

## Querying

Through the proxy, with the query token, on the same paths Grafana uses:

```bash
kubectl -n observability port-forward svc/observability-proxy 18080:80
T='Authorization: Bearer local-grafana-query-token-not-a-secret'
P=http://127.0.0.1:18080/internal/observability
curl -H "$T" "$P/metrics/api/v1/label/service.name/values"
curl -H "$T" -G "$P/traces/api/search" --data-urlencode 'q={resource.service.name="operator"}'
curl -H "$T" "$P/logs/select/logsql/query" --data-urlencode 'query=service.name:pdf3-worker'
curl -H "$T" "$P/traces-logsql/select/logsql/query" \
  --data-urlencode 'query="resource_attr:service.name":operator | stats by (name) count(), quantile(0.95, duration)'
```

Besides a row per span, VictoriaTraces' LogsQL API holds trace index rows (the
`trace_id_idx_stream` stream), whose `duration` is the whole trace's. Filter on a span field, such
as `name:*` or a `{resource_attr:service.name="operator"}` stream filter, before `stats count()`
or `quantile(0.95, duration)`, or the index rows are counted too.
