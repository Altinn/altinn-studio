# Altinn Studio Operator

This Kubernetes operator runs in every [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

- It does the cluster-side work for apps, such as Maskinporten clients, secrets, alert routing and databases.
- Each task has its own controller in [`internal/controller`](internal/controller).
  [`cmd/main.go`](cmd/main.go) registers the controllers.

## How it fits with the rest

- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) creates a `MaskinportenClient` resource for each
  app that needs Maskinporten scopes. The operator then creates the client in Maskinporten and writes its
  credentials to the app's secret.
- Outside production, the inactivity scaler scales workloads down to one replica.
    - In clusters with no apps, it scales down the gateway and pdf3.
    - In `ttd`'s clusters, it also scales down apps, the gateway and pdf3 outside working hours.
    - The [pdf3 README](../pdf3/README.md) describes how this affects pdf3.

## Developing

- The tests need Docker or Podman.
- When run outside CI, `make test` and `make test-e2e` update changed snapshots instead of failing.
- `make test-e2e` leaves its Kind cluster running. `make stop` removes it.
- [`docs/maintenance.md`](docs/maintenance.md) describes recurring maintenance tasks.

## Constraints

- Flux never deletes the operator's CRDs. If a CRD is removed from the manifests, someone must delete it from the
  cluster by hand. [`config/crd/kustomization.yaml`](config/crd/kustomization.yaml) explains why.
