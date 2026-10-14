# pdf3

pdf3 generates PDFs for Altinn apps: workers print app pages to PDF in headless Chrome, behind a proxy that apps call.

## How it fits with the rest

- Runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters), from
  [`infra/kustomize`](infra/kustomize).
- Apps call `http://pdf-generator.pdf.svc.cluster.local/pdf`, set in the
  [apps config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml). The address belonged to the old
  PDF generator. An `HTTPRoute` in [`pdf.yaml`](../../../infra/runtime/syncroot/base/pdf.yaml) sends it to the pdf3
  proxy.
- `studioctl env up` runs only the worker, which apps call directly. It uses the worker image tagged `tt02`, which
  moves when a build reaches `tt_ring1`.
- The [operator](../operator/README.md)'s inactivity scaler can scale pdf3 down outside production. While it does, it
  pauses Flux on pdf3's autoscalers, so changes to them in pdf3's manifests wait until pdf3 is scaled up again.
- PDF/A conversion is turned on per environment and service owner in [`internal/config`](internal/config).

## Moving to DIS Core

pdf3 is moving to [DIS Core](../../../docs/infrastructure/environments.md#dis-core).

- Planned: one pdf3 serves all service owners. Apps keep calling the same address, and the [relay](cmd/relay) forwards
  their requests through DIS Edge to the shared proxy, with an [API key](docs/api-keys.md) and the cluster's service
  owner.
- Neither the relay nor the shared pdf3 is deployed yet.
- Flux applies pdf3's DIS Core manifests, in [`infra/syncroot`](infra/syncroot), as the service account
  `flux-applier` in the namespace `product-studio-pdf3`.

## Developing

pdf3 is developed on Linux and macOS. `make help` lists the targets.

- The tests need Docker or Podman.
- Run `make test-e2e` after changing how PDFs are generated. It leaves its Kind cluster running; `make stop` removes
  it.
- Outside CI, the integration tests overwrite their snapshots in `_snapshots/` instead of failing. Review the snapshot
  diff before you commit.
- [`test`](test) is a separate Go module for the test orchestration. Dependencies the binaries need belong in the root
  module.

## Constraints

- Locally, studioctl supplies pdf3's settings, and a developer's studioctl may be older than the `tt02` image. When you
  rename or change a setting, keep the previous form working for one studioctl release.
- A worker generates one PDF at a time and returns `429` when its queue is full. The proxy retries on `429`, so
  capacity comes from the number of workers.
