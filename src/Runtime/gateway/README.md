# Gateway

The gateway connects Designer to each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Designer uses it to manage app deployments and read metrics. The gateway reports deployment results and forwards alerts to Designer.

Several Studio environments share the same runtime cluster. The gateway reports each deployment's results to the
Studio environment that owns it.

The [operator](../operator/README.md) supplies the gateway's credentials and can scale it down outside production.

## Telemetry

The gateway follows the observability standard. The gateway dashboard in
[altinn-dashboards-grafana](https://github.com/Altinn/altinn-dashboards-grafana) depends on its metric and attribute
names. The gateway keeps every trace it takes part in, since a deploy's trace starts in Designer, outside the runtime
cluster's sampling.

## Development

The [Makefile](Makefile) defines the build and test commands. E2E tests require Docker or Podman.
`make test-e2e` tests the compiled AOT image, which unit tests do not cover.
It leaves its Kind cluster running. `make stop` removes it.
