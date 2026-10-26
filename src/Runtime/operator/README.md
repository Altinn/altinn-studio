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

The operator follows the [observability standards](https://github.com/Altinn/altinn-studio/issues/21073) through
the shared [`telemetry`](../../common/go/AGENTS.md) package. Its dashboard is Altinn Studio — Operator in the
shared Grafana.

- Each run of a controller, a reconcile or one pass of a periodic sync, starts from `telemetry.StartRun`. Its entry
  span carries `altinn.operator.controller`, failures set `error.type` with `SetError`, and a failed run logs one
  ERROR linked to its trace. Use the logger from the run's context so other records link to the trace too.
- Kubernetes API calls are spans only inside a run. Watches are neither traced nor counted.
- The router in each service owner cluster sets `altinn.service_owner` and `deployment.environment.name`.

| Metric                                   | Type               | Attributes                                                                   |
| ---------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `altinn.operator.run.duration`           | histogram, s       | `altinn.operator.controller`, `error.type` on failure                        |
| `altinn.operator.maskinporten.clients`   | gauge, leader only | `altinn.operator.maskinporten.client.state`: `ready`, `not_ready`, `unknown` |
| `altinn.operator.inactivityscaler.state` | gauge, leader only | the state, `altinn.operator.inactivityscaler.state_forced`                   |
| `altinn.operator.leader`                 | gauge              | 1 while elected, else 0                                                      |
| `altinn.workload.start_time`             | gauge, s           | process start time, with `service.instance.id` on the resource               |
