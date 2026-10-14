# Altinn Studio Operator

The operator is a Kubernetes operator in every
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters). It does the cluster-side work for
the apps there, such as Maskinporten clients, secrets, alert routing and databases. Each job is a controller in
[`internal/controller`](internal/controller), registered in [`cmd/main.go`](cmd/main.go).

## How it fits with the rest

- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) creates a `MaskinportenClient` resource for each
  app that needs Maskinporten scopes. The operator creates the client in Maskinporten and writes its credentials to
  the app's secret.
- Outside production, the inactivity scaler scales the gateway and [pdf3](../pdf3/README.md) down in clusters with
  no apps. In `ttd`'s clusters it also scales the apps, the gateway and pdf3 down outside working hours. It pauses
  Flux on the autoscalers it scales down, such as pdf3's, but not on deployments.

## Developing

The tests need Docker or Podman. Outside CI, `make test` and `make test-e2e` update changed snapshots instead of
failing, so review the snapshot diff. `make test-e2e` leaves its Kind cluster running; `make stop` removes it.

Flux never deletes the operator's CRDs, so removing a CRD is a manual step.
[`config/crd/kustomization.yaml`](config/crd/kustomization.yaml) explains why.

[`docs/maintenance.md`](docs/maintenance.md) describes recurring maintenance work.
