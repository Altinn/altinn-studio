# AGENTS.md — Kubernetes Wrapper (`src/Runtime/kubernetes-wrapper`)

A .NET application (`Altinn.Studio.KubernetesWrapper`) exposing a **REST API with information about
Kubernetes deployments**. It surfaces cluster/deployment state to other platform components (e.g. the
[gateway](../gateway/AGENTS.md) / Studio) over HTTP.

Part of the [Runtime services](../AGENTS.md). See [`README.md`](README.md).

## Testing

Tested locally against a [kind](https://kind.sigs.k8s.io/) cluster with end-to-end tests. On Linux/macOS:

```shell
make test        # unit tests
make test-e2e    # spins up a kind cluster, builds + loads the image, deploys, port-forwards, asserts
make clean       # tear down
```

`make test-e2e` leaves a port-forward on `8080` intact so you can hit the API directly after the run.

## Working here

- The API is a contract consumed by other components — keep responses stable and documented.
- Follow the .NET build/formatting conventions used across the Runtime services.
