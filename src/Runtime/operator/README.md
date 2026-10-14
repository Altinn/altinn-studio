# Altinn Studio Operator

Kubernetes operator in every [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).

- Does the cluster-side work for apps, such as Maskinporten clients, secrets, alert routing and databases.
- Each job is a controller in [`internal/controller`](internal/controller), registered in [`cmd/main.go`](cmd/main.go).

## How it fits with the rest

- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) creates a `MaskinportenClient` resource for each
  app that needs Maskinporten scopes. The operator creates the client in Maskinporten and writes its credentials to
  the app's secret.
- The inactivity scaler runs outside production:
    - In clusters with no apps, it scales the gateway and [pdf3](../pdf3/README.md) down to one replica.
    - In `ttd`'s clusters, it also scales apps, the gateway and pdf3 down outside working hours.
    - pdf3's README describes what this means for pdf3.

## Developing

- The tests need Docker or Podman.
- Outside CI, `make test` and `make test-e2e` update changed snapshots instead of failing.
- `make test-e2e` leaves its Kind cluster running. `make stop` removes it.
- Flux never deletes the operator's CRDs, so removing one is manual. See
  [`config/crd/kustomization.yaml`](config/crd/kustomization.yaml).
- Recurring maintenance: [`docs/maintenance.md`](docs/maintenance.md).
