# GitHub Actions runner

This directory provides the self-hosted runners for workflows in this repository. Workflows select them with
`runs-on: self-hosted-ubuntu`. [GitHub Actions](../../../.github/README.md) describes when to use them.

Each job runs in its own Sandbox virtual machine:

- The [runner image](Dockerfile) contains the tools and caches that jobs expect. [`smoke.sh`](smoke.sh) tests a built
  image.
- The [coordinator](coordinator/README.md) starts the virtual machine, registers an ephemeral runner in it, and
  removes both when the job ends.
- KEDA starts a coordinator for each queued job, as configured in the [ScaledJob](infra/kustomize/base/scaledjob.yaml).

Flux deploys the runners to the Studio production cluster from its
[syncroot](../../../infra/studio/syncroot/prod/kustomization.yaml). [`sandbox-node`](../sandbox-node/README.md)
prepares the nodes they run on.

The image uses the Go version from [the releaser's `go.mod`](../../tools/releaser/go.mod), the Rust version from
[`rust-toolchain.toml`](../../../rust-toolchain.toml) and the Cypress version from
[App frontend's `package.json`](../../App/frontend/package.json).

## Isolation

- The coordinator keeps the GitHub App credentials. The virtual machine receives only a short-lived registration
  token, which [`run.sh`](run.sh) removes from the environment before the Actions runner starts.
- Deployment also publishes a prepared image, which is the runner image converted for the Sandbox provider. An init
  container in each runner Pod imports it into the node's image cache. Jobs start faster, and runner Pods need no
  registry credentials.
- Jobs on the same node share only that image cache. Each job keeps its file system, workspace and Docker data to
  itself.
