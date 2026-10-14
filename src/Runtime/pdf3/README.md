# pdf3

pdf3 generates PDFs for Altinn apps. A proxy distributes requests to workers, which render app pages in headless Chrome.

## Where it runs

pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Apps use the address in [apps-config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml),
which the [runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml) directs to pdf3.
The [deployment workflow](../../../.github/workflows/deploy-runtime-pdf3.yaml) publishes its image and
[configuration](infra/kustomize).

[Local environments](../../cli/README.md#which-images-the-environment-runs) run the worker directly, without the proxy.
studioctl supplies its settings and selects the image.

Support for a shared service consists of a [relay](cmd/relay), [API-key authentication](docs/api-keys.md),
and [DIS Core provisioning](infra/syncroot). The relay and shared service are not deployed by the current manifests.

## Development

The [Makefile](Makefile) defines the build and test commands. Tests require Docker or Podman.
Run `make test-e2e` after changing PDF generation. It leaves its Kind cluster running. `make stop` removes it.
Outside CI, integration tests update snapshots by default. Review those changes before committing.

## Constraints

- studioctl can be older than the worker image. Keep changed settings compatible with the previous studioctl release.
- Outside production, the [operator](../operator/README.md) can scale pdf3 down and pause Flux on its autoscalers.
  Autoscaler changes take effect when pdf3 is scaled up again.
