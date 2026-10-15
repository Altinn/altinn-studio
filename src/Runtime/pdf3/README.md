# pdf3

pdf3 generates PDFs for Altinn apps. A proxy distributes requests to workers, which render app pages in headless Chrome.

pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Apps use the address in [apps-config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml),
which the [runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml) directs to pdf3.

[Local environments](../../cli/README.md#which-images-the-environment-runs) run the worker directly, without the proxy.
studioctl supplies its settings and selects the image.

## DIS Core

pdf3 also runs as a shared service in every [DIS Core](../../../docs/infrastructure/environments.md#dis-core)
environment, without traffic so far. Runtime clusters are to call it through the [relay](cmd/relay) with an
[API key](docs/api-keys.md), and the relay is not deployed yet.

The DIS Core manifests in [`infra/syncroot`](infra/syncroot) are adapted from the runtime clusters' manifests in
[`infra/kustomize`](infra/kustomize), not an overlay of them. Keep the two in step.
[`deploy-runtime-pdf3.yaml`](../../../.github/workflows/deploy-runtime-pdf3.yaml) publishes them with the images it builds
for the runtime clusters.

The workers' [network policy](infra/syncroot/base/network-policies.yaml) allows DNS only through CoreDNS. It is not
confirmed that DIS Core's pods use CoreDNS rather than AKS LocalDNS. If they do not, the workers cannot resolve names.

## Development

The [Makefile](Makefile) defines the build and test commands. Tests require Docker or Podman.
Run `make test-e2e` after changing PDF generation. It leaves its Kind cluster running. `make stop` removes it.
Outside CI, integration tests update snapshots by default. Review those changes before committing.
