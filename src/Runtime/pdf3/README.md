# pdf3

pdf3 generates PDFs for Altinn apps. A proxy distributes requests to workers, which render app pages in headless Chrome.

pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Apps use the address in [apps-config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml),
which the [runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml) directs to pdf3.

[Local environments](../../cli/README.md#which-images-the-environment-runs) run the worker directly, without the proxy.
studioctl supplies its settings and selects the image.

## DIS Core

pdf3 also runs as a shared service in every [DIS Core](../../../docs/infrastructure/environments.md#dis-core)
environment. Runtime clusters call it through the [relay](cmd/relay), which sends an [API key](docs/api-keys.md).

The runtime clusters of every environment also run the [relay](infra/kustomize/relay). There, the
[HTTPRoute `pdf/pdf3`](infra/kustomize/route) splits apps' requests between the proxy and the relay, with weights
from Git that the Flux Kustomization `pdf3-route` in
[`infra/runtime/syncroot/base/pdf3-route.yaml`](../../../infra/runtime/syncroot/base/pdf3-route.yaml) applies. The relay's weight is 0
everywhere so far. The route takes precedence over `pdf/pdf3-migration` in the
[runtime routing configuration](../../../infra/runtime/syncroot/base/pdf.yaml), which sends every request to the
proxy. at24 has no DIS Core, so its relay calls tt02's.

The DIS Core manifests in [`infra/syncroot`](infra/syncroot) are adapted from the runtime clusters' manifests in
[`infra/kustomize`](infra/kustomize), not an overlay of them. Keep the two in step.
[`deploy-runtime-pdf3.yaml`](../../../.github/workflows/deploy-runtime-pdf3.yaml) publishes them with the images it builds
for the runtime clusters.

The workers' [network policy](infra/syncroot/base/network-policies.yaml) allows DNS only through CoreDNS. It is not
confirmed that DIS Core's pods use CoreDNS rather than AKS LocalDNS. If they do not, the workers cannot resolve names.

### Change the weights

The weights are relative, and a change reaches the clusters with the runtime syncroot. Never set both to 0. Before
raising the relay's weight in a cluster, check that the Deployment `runtime-pdf3/pdf3-relay` is available there.

- For one environment, patch the ConfigMap `pdf3-route` in the environment's overlay in `infra/runtime/syncroot`.
- For one cluster, add a ConfigMap to the environment's overlay that is named after the service owner. It overrides
  the environment's weights:

  ```yaml
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: pdf3-route-ttd
    namespace: runtime-pdf3
  data:
    PDF3_PROXY_WEIGHT: "90"
    PDF3_RELAY_WEIGHT: "10"
  ```

Flux applies the weights within 5 minutes of the syncroot reaching the cluster, or at once with
`flux reconcile kustomization -n runtime-pdf3 pdf3-route`. `go run cmd/main.go status <environments> httproute pdf/pdf3`
in the [health tool](../../tools/health) shows them in every cluster.

To roll back, revert the change in Git. In an emergency, stop Flux from applying the route and delete it, so that
`pdf3-migration` sends everything to the proxy at once. `flux resume` brings the route back with the weights in Git.

```sh
flux suspend kustomization -n runtime-pdf3 pdf3-route
kubectl delete httproute -n pdf pdf3
```

## Development

The [Makefile](Makefile) defines the build and test commands. Tests require Docker or Podman.
Run `make test-e2e` after changing PDF generation. It leaves its Kind cluster running. `make stop` removes it.
Outside CI, integration tests update snapshots by default. Review those changes before committing.
