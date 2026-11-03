# Core

Components that run in a Studio cluster, the control plane of Altinn Studio. The
[src folder ADR](../../docs/adr/2026-10-27-src-folder-organization.md) moves the rest of Core here over time.

- [operator](operator/README.md) is the core operator. It does the work that Studio services must not do themselves,
  such as cluster work, as durable workflows. Services such as the assistant ask it to run app code in a sandbox
  through its run API.
- [operator-workflow-engine](operator-workflow-engine/README.md) hosts the workflow engine for the operator. It keeps
  each run as a durable workflow and calls the operator for each step.
- [job-host](job-host/README.md) runs one command in a new microVM in the pod of each run's Job.
