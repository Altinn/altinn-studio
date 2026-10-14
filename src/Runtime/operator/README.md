# Altinn Studio operator

The operator manages app credentials and other resources in each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

Outside production, the operator also scales inactive workloads down according to its
[inactivity policy](internal/controller/inactivityscaler/controller.go).

## Development

The [Makefile](Makefile) defines the build, test, and lint commands. Tests require Docker or Podman.
Outside CI, tests update changed snapshots by default. Review those changes before committing.
`make test-e2e` leaves its Kind cluster running. `make stop` removes it.

[Maintaining the operator](docs/maintenance.md) covers API updates and credential renewal.
