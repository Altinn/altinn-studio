# pdf3

pdf3 generates PDFs for Altinn apps. A proxy distributes requests to workers, which render app pages in headless Chrome.

Each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters) runs a relay
that forwards PDF requests to DIS Core. Apps keep using the address in
[apps-config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml). The
[runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml) preserves that Service address.

[Local environments](../../cli/README.md#which-images-the-environment-runs) run the worker directly, without the proxy.
studioctl supplies its settings and selects the image.

## DIS Core

The proxy and workers run as a shared service in every [DIS Core](../../../docs/infrastructure/environments.md#dis-core)
environment. Runtime clusters call it through the [relay](cmd/relay) with an [API key](docs/api-keys.md), and the
[HTTPRoute `pdf/pdf3`](infra/kustomize/relay/httproute.yaml) routes all apps' PDF requests to the relay.
The [environment overlays](infra/kustomize) set its upstream URL. at24's relay calls tt02's DIS Core.

The DIS Core manifests live in [`infra/syncroot`](infra/syncroot). The tenant relay and local-test manifests live in
[`infra/kustomize`](infra/kustomize); only the local-test overlays use its proxy/worker base.
[`deploy-runtime-pdf3.yaml`](../../../.github/workflows/deploy-runtime-pdf3.yaml) publishes both artifacts and builds
the proxy, relay and worker images.

The workers' [network policy](infra/syncroot/base/network-policies.yaml) allows DNS only through CoreDNS. It is not
confirmed that DIS Core's pods use CoreDNS rather than AKS LocalDNS. If they do not, the workers cannot resolve names.

## Development

The [Makefile](Makefile) defines the build and test commands. Tests require Docker or Podman.
Run `make test-e2e` after changing PDF generation. It leaves its Kind cluster running. `make stop` removes it.
Outside CI, integration tests update snapshots by default. Review those changes before committing.
