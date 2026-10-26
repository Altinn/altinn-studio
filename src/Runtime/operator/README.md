# Altinn Studio operator

Altinn Studio operator is a Kubernetes operator with multiple controllers in
[`internal/controller`](internal/controller). It runs in each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

## Development

The [Makefile](Makefile) defines the build, test, and lint commands. Tests require Docker or Podman.
Outside CI, tests update changed snapshots by default. Review those changes before committing.
`make test-e2e` leaves its Kind cluster running. `make stop` removes it.

[Maintaining the operator](docs/maintenance.md) covers API updates and credential renewal.

## Telemetry

The operator's [dashboard](https://github.com/Altinn/altinn-dashboards-grafana) queries its metric names and attributes,
so a change to them needs a change to the dashboard too. The
[router](../../../infra/observability/runtime/overlay/patches/router-config.yaml) in each runtime cluster adds the
service owner and the environment.

Start each controller run with [`telemetry.StartRun`](internal/telemetry/run.go), and log with the logger from its
context, so that the run's failures and logs link to its trace.
