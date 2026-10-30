# Kubernetes Wrapper

The Kubernetes Wrapper reports the deployments and daemon sets in the cluster it runs in, through a REST API. It
runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters) and in
each Studio cluster. [`deploy-runtime-kubernetes-wrapper.yaml`](../../../.github/workflows/deploy-runtime-kubernetes-wrapper.yaml)
publishes it for both.

Tools in [`src/tools`](../../tools) read it to list the apps deployed to an environment. Keep the responses compatible
with them.

## Development

The [Makefile](Makefile) defines the build and test commands. `make test-e2e` requires Docker or Podman and Kind. It
deploys the wrapper to a Kind cluster, checks its responses and deletes the cluster. To call the API yourself, run
`make build port-forward` instead, which leaves the API on port 8080, and `make clean` when you are done.
