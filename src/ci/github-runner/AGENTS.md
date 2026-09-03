# AGENTS.md

This directory contains the GitHub Actions runner image, the host coordinator and their Kubernetes deployment.

## Design constraints

- Keep runner lifecycle code backend-neutral. Provider construction belongs in `coordinator/src/provider.rs`; do not
  expose provider cache formats or directory layouts to the coordinator, runner scripts or deployment workflow.
- Prepared images are immutable, provider-owned derivatives of OCI image identities. They are both a cold-start
  optimization and the way runtime runner Pods avoid receiving registry credentials.
- Keep durable GitHub App credentials in the coordinator. The guest receives only a short-lived runner registration
  token, which must be removed from its environment before the Actions runner starts.
- Coordinators on one node may share only the disposable immutable image cache. Writable roots, workspaces, Docker
  data and credentials remain private to each Job.
