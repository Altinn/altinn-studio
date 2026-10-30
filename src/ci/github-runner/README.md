# GitHub Actions runner

The self-hosted runners for this repository's workflows. Workflows select them with `runs-on: self-hosted-ubuntu`,
and [GitHub Actions](../../../docs/cicd.md) says when to use them.

Each job runs in its own Sandbox virtual machine:

- The [runner image](Dockerfile) has the tools and caches that jobs expect. [smoke.sh](smoke.sh) tests a built image.
- The [coordinator](coordinator/README.md) starts the virtual machine, registers an ephemeral runner in it, and
  removes both when the job ends.
- KEDA starts a coordinator for each queued job, as the [ScaledJob](infra/kustomize/base/scaledjob.yaml) configures.

Flux deploys the runners to the Studio cluster from its
[syncroot](../../../infra/studio/syncroot/prod/kustomization.yaml). [sandbox-node](../sandbox-node/README.md) prepares the nodes they run on.

## Design constraints

- The coordinator keeps the GitHub App credentials. The virtual machine receives only a short-lived registration
  token, which [run.sh](run.sh) removes from the environment before the Actions runner starts.
- Deployment also publishes a prepared image: the runner image converted for the Sandbox provider. An init container
  in each runner Pod imports it into the node's image cache. Jobs start faster, and runner Pods need no registry
  credentials. A prepared image never changes once published.
- Jobs on the same node share only that image cache. Each job keeps its file system, workspace and Docker data to
  itself.
- Only [provider.rs](coordinator/src/provider.rs) knows which Sandbox provider the runners use.
