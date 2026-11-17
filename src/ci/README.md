# Continuous integration

The runners that execute CI jobs for GitHub and Gitea, and the services that support them.

- [github-runner](github-runner/README.md) runs the self-hosted runners for this repository's GitHub Actions
  workflows.
- `gitea-runner` builds the Gitea Actions runner image. The [gitea-org-runner](../../charts/gitea-org-runner) chart
  runs it for the service owner organizations in Studio's Gitea.
- [runner-org-sync](runner-org-sync/README.md) keeps the Gitea runner configuration in step with the list of service
  owners.
- [sandbox-hosting](sandbox-hosting/README.md) is the Rust crate that Sandbox workloads use inside their pods: the
  Provider setup, `sandbox-image` and host checks.
- [sandbox-node](sandbox-node/README.md) prepares the nodes that run Sandbox workloads.

Host setup that all Sandbox workloads share belongs in `sandbox-node` on the node and in `sandbox-hosting` inside the
workload. Logic for one kind of runner belongs in that runner's directory.
