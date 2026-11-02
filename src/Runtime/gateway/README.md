# Gateway

The gateway connects Designer to each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Designer uses it to manage app deployments and read metrics. The gateway reports deployment results and forwards alerts to Designer.

Several Studio environments share the same runtime cluster. The gateway reports each deployment's results to the
Studio environment that owns it.

The [operator](../operator/README.md) supplies the gateway's credentials and can scale it down outside production.

## Health

`GET /runtime/gateway/api/v1/health` reports whether the runtime cluster's services are available, for the platform
team's uptime monitoring. It answers without authentication, so it shows each check's status and duration, but no
details. The format follows [altinn-aspnet-healthchecks](https://github.com/Altinn/altinn-aspnet-healthchecks), the
convention proposed for Altinn's products, without depending on it.

The checks run every 30 seconds in the background, and the endpoint answers with their latest result. It answers 503
until they have run, and if they stop running. A new gateway is not ready until they have run once, so a rollout does
not show as downtime. The kubelet's probes do not run them, so an unavailable dependency does not take the gateway out
of rotation.

- **pdf3** calls the relay's `/pdf/health` at the address apps call for PDFs, so the request takes the same HTTPRoute
  as theirs. Without the route, the Service behind the address has no endpoints and Linkerd fails the request.
  It is off in the local kind cluster, which has no relay.

## Telemetry

The gateway follows the observability standard. The gateway dashboard in
[altinn-dashboards-grafana](https://github.com/Altinn/altinn-dashboards-grafana) depends on its metric and attribute
names. The gateway keeps every trace it takes part in, since a deploy's trace starts in Designer, outside the runtime
cluster's sampling.

## Development

The [Makefile](Makefile) defines the build and test commands. E2E tests require Docker or Podman.
`make test-e2e` tests the compiled AOT image, which unit tests do not cover.
It leaves its Kind cluster running. `make stop` removes it.
