# pdf3

pdf3 generates PDFs for Altinn apps. Apps call the pdf3 proxy, which sends each request to a worker. The worker opens
the app page in headless Chrome and prints it to PDF.

## How it fits with the rest

- pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
  Its manifests are in [`infra/kustomize`](infra/kustomize).
- Apps call `http://pdf-generator.pdf.svc.cluster.local/pdf`, which the
  [apps config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml) sets. This was the address of the
  old PDF generator. An `HTTPRoute` in [`pdf.yaml`](../../../infra/runtime/syncroot/base/pdf.yaml) sends requests for
  it to the pdf3 proxy.
- `studioctl env up` runs only the worker, and apps call the worker directly. studioctl uses the worker image tagged
  `tt02`. The tag moves to a new build when that build reaches `tt_ring1`.
- Outside production, the [operator](../operator/README.md)'s inactivity scaler can scale pdf3 down. While pdf3 is
  scaled down, the scaler pauses Flux on pdf3's autoscalers. Changes to the autoscalers in pdf3's manifests take effect
  when pdf3 is scaled up again.
- PDF/A conversion is turned on per environment and service owner in [`internal/config`](internal/config).

## Moving to DIS Core

pdf3 is moving to [DIS Core](../../../docs/infrastructure/environments.md#dis-core).

- One shared pdf3 in DIS Core will serve all service owners.
- Apps will keep calling the same address. The [relay](cmd/relay) will forward their requests through DIS Edge to the
  shared proxy. It adds an [API key](docs/api-keys.md) and the cluster's service owner to each request.
- The relay and the shared pdf3 are not deployed yet.
- pdf3's DIS Core manifests are in [`infra/syncroot`](infra/syncroot). Flux applies them in the namespace
  `product-studio-pdf3` as the service account `flux-applier`.

## Developing

- pdf3 is developed on Linux and macOS.
- `make help` lists the make targets.
- The tests need Docker or Podman.
- Run `make test-e2e` after you change how PDFs are generated. The test leaves its Kind cluster running, and
  `make stop` removes it.
- Outside CI, the integration tests overwrite their snapshots in `_snapshots/` instead of failing. Review the snapshot
  diff before you commit.
- [`test`](test) is a separate Go module that orchestrates the tests. Add dependencies that the binaries need to the
  root module.

## Constraints

- When pdf3 runs locally, studioctl supplies its settings. A developer's studioctl can be older than the `tt02` image.
  When you rename or change a setting, keep the previous form working for one studioctl release.
- A worker generates one PDF at a time, and it returns `429` when its queue is full. The proxy retries requests that
  get `429`, so capacity depends on the number of workers.
