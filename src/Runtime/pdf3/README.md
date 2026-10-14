# pdf3

pdf3 generates the PDFs for Altinn apps. A worker loads a page of the app in headless Chrome and prints it to PDF.
A proxy in front of the workers is the API that apps call. pdf3 runs in each service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters), from the manifests in
[`infra/kustomize`](infra/kustomize).

## How it fits with the rest

- Apps call `http://pdf-generator.pdf.svc.cluster.local/pdf`, set in the
  [apps config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml). The address belonged to the
  old PDF generator, and an `HTTPRoute` in
  [`infra/runtime/syncroot/base/pdf.yaml`](../../../infra/runtime/syncroot/base/pdf.yaml) sends it to the pdf3
  proxy.
- Locally, `studioctl env up` runs only the worker, and apps call it directly. By default it runs the worker image
  tagged `tt02`, which moves each time a build reaches `tt_ring1`.
- Outside production, the [operator](../operator/README.md) can scale pdf3 down. While it does, it sets the minimum
  replicas of pdf3's autoscalers and pauses Flux reconciliation of them, so changes to the autoscalers in pdf3's
  manifests wait until pdf3 is scaled up again.
- PDF/A conversion is turned on per environment and service owner in [`internal/config`](internal/config).

## Moving to DIS Core

pdf3 is moving to [DIS Core](../../../docs/infrastructure/environments.md#dis-core), where one pdf3 serves all
service owners. Apps will keep calling the same address: the [relay](cmd/relay) will forward their requests through
DIS Edge to the shared proxy, with an API key and the cluster's service owner. [API keys](docs/api-keys.md)
describes the keys. Neither the relay nor the shared pdf3 is deployed yet.

## Developing

pdf3 is developed on Linux and macOS, and the tests need Docker or Podman. `make help` lists the targets. Run
`make test-e2e` after changing how PDFs are generated. It leaves its Kind cluster running for the next run;
`make stop` removes it.

Outside CI, the integration tests overwrite their snapshots in `_snapshots/` instead of failing, so review the
snapshot diff before you commit.

The [`test`](test) directory is a separate Go module for the test orchestration and its dependencies. Dependencies
that the binaries need belong in the root module.

## Constraints

- In a cluster, pdf3's settings are deployed with the image, in its manifests. Locally, studioctl supplies them,
  and a developer's studioctl may be older than the `tt02` image. When you rename or change a setting, keep the
  previous form working for one studioctl release.
- A worker generates one PDF at a time and returns `429` when its queue is full. The proxy retries on `429`, so
  capacity comes from the number of workers.
