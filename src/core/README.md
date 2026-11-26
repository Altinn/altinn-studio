# Core

Components that run in a Studio cluster, the control plane of Altinn Studio. The
[src folder ADR](../../docs/adr/2026-10-27-src-folder-organization.md) moves the rest of Core here over time.

- [operator-runner](operator-runner/README.md) runs one command in a new microVM in the pod of each run's Job.
