# Runtime Fixture

A container runtime fixture meant for development and tests.
It should match the runtime environment for Studio apps and runtime services (pdf, operator, ...).

## Monitoring

With `IncludeMonitoring` (`--monitoring` on the fixture and on the pdf3, operator and gateway testers),
the fixture also deploys the platform observability pipeline from `infra/observability`: the runtime
collectors, the observability-proxy and a Victoria backend, with a Grafana and a Grafana MCP server
that load Studio's datasources and dashboards from `Altinn/altinn-dashboards-grafana`. See
[`infra/observability/local`](../../../infra/observability/local/README.md).
