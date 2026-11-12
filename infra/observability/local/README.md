# Local observability stack

Studio's observability pipeline on the devenv kind fixture, so you can query a runtime service's telemetry the way
Studio prod queries it. Start it with `make start-minimal-monitoring` in `src/Runtime/pdf3`, `src/Runtime/operator` or
`src/Runtime/gateway`, or with `make run-monitoring` in `src/Runtime/devenv` without a service.

devenv publishes the overlays in this directory, the operators and the
[observability proxy](../../../src/observability-proxy) to the fixture, and Flux reconciles them as in a real cluster.
The overlays keep production's pipeline, such as its sampling and filters, so telemetry that production drops is
missing here too. They differ where one local cluster has to play both sides: the collectors send to the proxy in the
same cluster, storage is small and short-lived, and the tokens are fixed and not secret.

## Grafana

Grafana has Studio's datasources and dashboards from
[`Altinn/altinn-dashboards-grafana`](https://github.com/Altinn/altinn-dashboards-grafana), with the same names and
uids, so a dashboard built here works in the shared Grafana. To work on dashboards in your own checkout of that
repository, set `DEVENV_DASHBOARDS_REPOSITORY` to it and start the stack again after each change. Grafana loses
changes made in its UI when the pod restarts.

Grafana lets anyone in as an admin, so the fixture's ingress does not expose it. Reach it with
`kubectl -n grafana port-forward svc/grafana`.

## Querying

Query through the proxy as Grafana does, with the query token in [auth-tokens.yaml](studio/auth-tokens.yaml). VictoriaTraces' LogsQL API also
holds one index row per trace, so filter on a span field, such as `name:*`, before you count or aggregate spans.
