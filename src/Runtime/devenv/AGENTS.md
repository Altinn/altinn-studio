# AGENTS.md — Runtime fixture (`src/Runtime/devenv`)

A Go-based **container runtime fixture** for development and tests. Its purpose is to match the runtime
environment that Studio apps and the other runtime services (`pdf3`, `operator`, …) run in, so behavior
observed locally or in tests mirrors production.

Part of the [Runtime services](../AGENTS.md). Go module with `cmd/` (entry points) and `pkg/`.

## Build & run

Run from `src/Runtime/devenv` (`make help` lists all targets):

```bash
make build          # build all packages
make test           # run tests (also: test-e2e, test-race, test-coverage)
make check          # tidy + fmt + lint + test (pre-commit gate)
make run / make stop # start/stop the standard runtime-fixture container
```

## Working here

- Other services and tests depend on this for a consistent environment — a change here can alter how
  `pdf3`, `operator`, etc. behave under test. Keep it faithful to the real runtime.
- `IncludeMonitoring` deploys the platform observability stack from the production manifests in
  `infra/observability`, through the local overlays in `infra/observability/local`. Change those
  overlays rather than the fixture when production's manifests change; `TestMonitoringOverlaysRender`
  renders them.
- grafana-operator, at the shared Grafana's version, syncs `products/studio` from
  `Altinn/altinn-dashboards-grafana` (a clone in the cache, or `DEVENV_DASHBOARDS_REPOSITORY`) into the
  monitoring Grafana. The fixture applies the repository's resources unchanged except for the datasource
  URLs, and creates the Secrets the platform's ExternalSecrets would. Unit tests use
  `pkg/runtimes/kind/testdata/dashboards` so they never clone.
- `MonitoringProfileFull` (`--monitoring-profile full`) reconciles the `*-full` overlays and syncs the
  alert rules and contact points too, notifying the in-cluster `alert-recorder`. `cmd/alerttest`
  (`make test-alerts-check`, `make test-alerts`, `make test-alerts-quiet`) checks and fires them against
  the running fixture; each fault is a `Scenario` in `pkg/alerttest`, and reads the rule from Grafana
  rather than copying its query.
