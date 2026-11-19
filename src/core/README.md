# Core

Components that run in a Studio cluster, the control plane of Altinn Studio. The
[src folder ADR](../../docs/adr/2026-10-27-src-folder-organization.md) moves the rest of Core here over time.

- [operator](operator/README.md) does work that Studio services must not do themselves, such as running app code in
  a sandbox, as durable workflows.
- [operator-runner](operator-runner/README.md) runs one command in a new microVM in the pod of each run's Job.

A name keeps the prefix `core-` where another operator, such as the runtime operator, can be beside it. So the Go
module, the image, the workflows, the syncroot entry, the operator's namespace and the telemetry use `core-operator`.
The names inside the operator's namespace and its token audience use `operator`. The parts of the operator follow the
same rule: in the Studio cluster they are `operator-runner` and `operator-workflow-engine`, and in the registry and the
telemetry they keep `core-`.
