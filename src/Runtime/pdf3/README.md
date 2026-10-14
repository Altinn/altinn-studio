# pdf3

pdf3 generates PDFs for Altinn apps. A proxy distributes requests to workers, which render app pages in headless Chrome.

pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Apps use the address in [apps-config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml),
which the [runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml) directs to pdf3.

[Local environments](../../cli/README.md#which-images-the-environment-runs) run the worker directly, without the proxy.
studioctl supplies its settings and selects the image.

pdf3 also runs as a shared service in [DIS Core](docs/dis-core.md), so far only in at22 and without traffic.
Runtime clusters will reach it through a [relay](cmd/relay) with an [API key](docs/api-keys.md).
The relay is not deployed yet.

[`deploy-runtime-pdf3.yaml`](../../../.github/workflows/deploy-runtime-pdf3.yaml) builds pdf3 and deploys the same
build to the runtime clusters, through the release rings, and to DIS Core.

## Development

The [Makefile](Makefile) defines the build and test commands. Tests require Docker or Podman.
Run `make test-e2e` after changing PDF generation. It leaves its Kind cluster running. `make stop` removes it.
Outside CI, integration tests update snapshots by default. Review those changes before committing.
