# Continuous integration

This directory holds the runners that execute CI jobs for GitHub and Gitea, and the services that support them.

- [`github-runner`](github-runner/README.md) runs the self-hosted runners for this repository's GitHub Actions
  workflows.
- `gitea-runner` builds the Gitea Actions runner image. The [`gitea-org-runner`](../../charts/gitea-org-runner) chart
  runs it for service owner organizations in Studio's Gitea.
- [`runner-org-sync`](runner-org-sync/README.md) keeps the Gitea runner configuration in step with the list of
  service owners.
- [`sandbox-node`](sandbox-node/README.md) prepares the nodes that run Sandbox workloads.

`sandbox-node` handles only the host setup that all Sandbox workloads share. Logic for one kind of runner belongs in
that runner's directory.
