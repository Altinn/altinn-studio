# Altinn Studio operator

This Kubernetes operator runs in every [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
It manages resources that apps depend on, including Maskinporten clients, secrets, alert routing, and databases.
[`cmd/main.go`](cmd/main.go) registers the controllers that manage these resources.

## How it fits with the rest

[`deploy-app.yaml`](../../App/azure-pipelines/deploy-app.yaml) creates a `MaskinportenClient` resource for each
app that needs Maskinporten scopes. The operator then creates the client in Maskinporten and writes its
credentials to the app's secret.

Outside production, the operator can reduce replicas for apps, the gateway, and pdf3 during periods of inactivity.
The [inactivity scaler](internal/controller/inactivityscaler/controller.go) defines which workloads it scales
based on the service owner, app presence, and working hours.

## Developing

The [Makefile](Makefile) defines the build, test, and lint targets. The test targets have these requirements and behaviors:

- Docker or Podman must be available.
- Outside CI, `make test` and `make test-e2e` update changed snapshots by default instead of failing on snapshot differences.
- `make test-e2e` leaves its Kind cluster running. `make stop` removes it.

[Maintaining the operator](docs/maintenance.md) covers API model updates, Kubebuilder upgrades, and renewal of the operator's Maskinporten credentials.

## Constraints

Flux does not prune the operator's CRDs because deleting a CRD also deletes its custom resources.
If a CRD is removed from the manifests, it remains in the cluster until someone deletes it by hand.
[`config/crd/kustomization.yaml`](config/crd/kustomization.yaml) defines this constraint and explains its effect on Maskinporten clients.
