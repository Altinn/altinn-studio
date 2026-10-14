# pdf3 in DIS Core

pdf3 runs as a shared service in [DIS Core](../../../../docs/infrastructure/environments.md#dis-core), in the
namespace `product-studio-pdf3`. In [`infra/syncroot`](../infra/syncroot), the environments other than at22 only
hold the empty kustomization that the platform seeded.

## Manifests

The platform's Flux applies the environment's [`app.yaml`](../infra/syncroot/at22/app.yaml), which applies the
environment's overlay of [`base`](../infra/syncroot/base). The comments in the manifests explain the choices in them.

The manifests are adapted from the runtime clusters' manifests in [`infra/kustomize`](../infra/kustomize), not an
overlay of them, because Flux only gets `infra/syncroot`. Keep the two in step until the runtime clusters relay to
DIS Core and their manifests are removed.

DIS Core denies inbound traffic to meshed pods unless a [Linkerd policy](../infra/syncroot/base/linkerd-policies.yaml)
allows it.

DIS Edge forwards `POST /pdf/v3/generate` on the environment's platform host, such as `platform.at22.altinn.cloud`,
to pdf3. The [HTTPRoute](../infra/syncroot/base/httproute.yaml) describes what is routed.

## Publishing

[`deploy-runtime-pdf3.yaml`](../../../../.github/workflows/deploy-runtime-pdf3.yaml) publishes `infra/syncroot` as
`studio-pdf3/syncroot:<sha>`, with the images it built in the same run. It sets the images in the Deployments'
annotations, so do not pin images in the overlays.

- Each environment's Flux reads the tag named after the environment. The workflow moves the tag in the GitHub
  environment `dis_core_<env>`, and yt01, tt02 and prod need a reviewer's approval.
- A push to main tags every DIS Core environment. A manual run tags the environments in its `dis-core-environments`
  input.
- Any change under `src/Runtime/pdf3`, including one to `infra/syncroot` only, also rolls pdf3 through the runtime
  release rings.

## Worker DNS

The workers' [network policy](../infra/syncroot/base/network-policies.yaml) allows DNS only to CoreDNS (`kube-dns`)
and denies link-local addresses. If DIS Core's pods resolve names through AKS LocalDNS (169.254.10.x), the workers
cannot resolve anything. This is not confirmed yet. After a deployment, check that a worker's nameserver is the IP of
the `kube-dns` Service:

```sh
kubectl -n product-studio-pdf3 exec deploy/pdf3-worker -- cat /etc/resolv.conf
```
