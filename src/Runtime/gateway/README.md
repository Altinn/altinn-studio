# Gateway

The gateway connects Designer to each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Designer uses it to manage app deployments and read metrics. The gateway reports deployment results and forwards alerts to Designer.

Several Studio environments share the same runtime cluster. The gateway and the
[app deployment pipeline](../../App/azure-pipelines/deploy-app.yaml) must agree on how to identify the Studio
environment that owns a deployment.

The [operator](../operator/README.md) supplies the gateway's credentials and can scale it down outside production.

## Deployment

The [deployment workflow](../../../.github/workflows/deploy-runtime-gateway.yaml) publishes the gateway image and configuration.
Flux deploys them through the [runtime syncroot](../../../infra/runtime/syncroot/base/gateway.yaml).

## Development

The [Makefile](Makefile) defines the build and test commands. E2E tests require Docker or Podman.
`make test-e2e` tests the compiled AOT image, which unit tests do not cover.
It leaves its Kind cluster running. `make stop` removes it.

## Constraints

The public API uses Maskinporten authentication. The internal API relies on its
[network policy](infra/kustomize/base/networkpolicy.yaml) to restrict access to Flux.
