# Altinn Studio Operator

The operator is a Kubernetes operator in every
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters). It does the cluster-side work for
the apps there, such as Maskinporten clients, secrets, alert routing and databases. Each job is a controller in
[`internal/controller`](internal/controller), registered in [`cmd/main.go`](cmd/main.go).

## How it fits with the rest

- [`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) creates a `MaskinportenClient` resource for each
  app that needs Maskinporten scopes. The operator creates the client in Maskinporten and writes its credentials to
  the app's secret.
- Outside production, the inactivity scaler scales down the gateway and [pdf3](../pdf3/README.md) in clusters with
  no apps, and the apps too outside working hours in some test clusters. It pauses Flux only on pdf3's autoscalers,
  as pdf3's README describes.

## Developing

The tests need Docker or Podman. Outside CI, `make test` and `make test-e2e` update changed snapshots instead of
failing, so review the snapshot diff. `make test-e2e` leaves its Kind cluster running; `make stop` removes it.

Flux never deletes the operator's CRDs, so removing a CRD is a manual step.
[`config/crd/kustomization.yaml`](config/crd/kustomization.yaml) explains why.

[`docs/maintenance.md`](docs/maintenance.md) describes recurring maintenance work.
