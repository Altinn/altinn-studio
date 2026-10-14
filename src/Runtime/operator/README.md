# Altinn Studio operator

The operator manages app credentials and other resources in each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
The [app deployment pipeline](../../App/azure-pipelines/deploy-app.yaml) declares the Maskinporten clients apps need.
The operator manages those clients and supplies credentials to the apps.

Outside production, the operator also scales inactive workloads down according to its
[inactivity policy](internal/controller/inactivityscaler/controller.go).

## Deployment

The [deployment workflow](../../../.github/workflows/deploy-runtime-operator.yaml) publishes the operator image and configuration.
Flux deploys them through the [runtime syncroot](../../../infra/runtime/syncroot/base/operator.yaml).

## Development

The [Makefile](Makefile) defines the build, test, and lint commands. Tests require Docker or Podman.
Outside CI, tests update changed snapshots by default. Review those changes before committing.
`make test-e2e` leaves its Kind cluster running. `make stop` removes it.

[Maintaining the operator](docs/maintenance.md) covers API updates and credential renewal.

## Constraints

Flux does not delete the operator's CRDs when they are removed from the manifests.
Deleting a CRD also deletes its custom resources. The
[CRD configuration](config/crd/kustomization.yaml) explains the consequences for Maskinporten clients.
