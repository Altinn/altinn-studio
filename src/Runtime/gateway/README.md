# Gateway

The gateway connects Designer to each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Designer uses it to manage app deployments and read metrics. The gateway reports deployment results and forwards alerts to Designer.

Several Studio environments share the same runtime cluster. The gateway reports each deployment's results to the
Studio environment that owns it.

The [operator](../operator/README.md) supplies the gateway's credentials and can scale it down outside production.

## Health

`GET /runtime/gateway/api/v1/health` is for the platform team's uptime monitoring,
[Altinn-Uptime](https://github.com/dis-way/gitops-manifests/tree/main/oci/altinn-uptime). It cannot authenticate, and
it counts a cluster as up only on a 200 whose body starts with `{"status":"healthy"`.

The checks call services at the addresses apps get from [apps-config](../../../infra/runtime/apps-config), so a cluster
fault that breaks apps also fails them, as in [altinn-platform#4358](https://github.com/Altinn/altinn-platform/issues/4358).
The platform access check calls the platform on the host apps get for Storage, so it goes through the
[platform proxy](../platform-proxy/README.md) once apps do.

## Telemetry

The gateway follows the observability standard. The gateway dashboard in
[altinn-dashboards-grafana](https://github.com/Altinn/altinn-dashboards-grafana) depends on its metric and attribute
names. The gateway keeps every trace it takes part in, since a deploy's trace starts in Designer, outside the runtime
cluster's sampling.

## Development

The [Makefile](Makefile) defines the build and test commands. E2E tests require Docker or Podman.
`make test-e2e` tests the compiled AOT image, which unit tests do not cover.
It leaves its Kind cluster running. `make stop` removes it.
