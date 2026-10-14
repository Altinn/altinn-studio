# Altinn Studio operator

Altinn Studio operator is a Kubernetes operator with multiple controllers in
[`internal/controller`](internal/controller). It runs in each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

## Development

The [Makefile](Makefile) defines the build, test, and lint commands. Tests require Docker or Podman.
Outside CI, tests update changed snapshots by default. Review those changes before committing.
`make test-e2e` leaves its Kind cluster running. `make stop` removes it.

[Maintaining the operator](docs/maintenance.md) covers API updates and credential renewal.
