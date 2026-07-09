# AGENTS.md — Kubernetes Wrapper (`src/Runtime/kubernetes-wrapper`)

A .NET application (`Altinn.Studio.KubernetesWrapper`) exposing a **REST API with information about
Kubernetes deployments**. It surfaces cluster/deployment state to other platform components (e.g. the
[gateway](../gateway/AGENTS.md) / Studio) over HTTP.

Part of the [Runtime services](../AGENTS.md). See [`README.md`](README.md).

## Testing

Tested locally against a [kind](https://kind.sigs.k8s.io/) cluster with end-to-end tests. On Linux/macOS:

```shell
make test        # unit tests (dotnet test)
make test-e2e    # build run-test clean: kind cluster up, build+load image, deploy, assert, then tear down
make clean       # tear down the kind cluster
```

`make test-e2e` runs `clean` at the end (`kind delete cluster`), so nothing is left running. To keep a
port-forward on `8080` for manual API calls, run `make build run-test` *without* `clean` (the
`run-test` step opens the forward via `integrationtests/curl-test.sh`).

## Working here

- The API is a contract consumed by other components — keep responses stable and documented.
- Follow the .NET build/formatting conventions used across the Runtime services.
