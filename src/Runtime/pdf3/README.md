# pdf3

pdf3 generates PDFs for Altinn apps. The proxy sends each request to a worker, which opens the app page in headless
Chrome and prints it to PDF.

## Runtime clusters

pdf3 runs in each service owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters).
Apps use the old PDF generator's address from the
[apps config](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml). An `HTTPRoute` in
[`pdf.yaml`](../../../infra/runtime/syncroot/base/pdf.yaml) sends those requests to the pdf3 proxy. The proxy and
worker manifests are in [`infra/kustomize`](infra/kustomize).

Outside production, the [operator](../operator/README.md)'s inactivity scaler can scale pdf3 down. While pdf3 is
scaled down, the scaler pauses Flux on pdf3's autoscalers. Changes to the autoscalers in pdf3's manifests take effect
when pdf3 is scaled up again.

A worker generates one PDF at a time and returns `429` when its queue is full. The proxy retries requests that
receive `429`, so capacity depends on the number of workers.

PDF/A conversion is enabled per environment and service owner in [`internal/config`](internal/config).

## Local environments

`studioctl env up` runs the worker, and local apps call it directly. The
[studioctl README](../../cli/README.md#which-images-the-environment-runs) describes how studioctl selects the worker
image.

studioctl also supplies the worker's settings. A developer's studioctl can be older than the worker image.
When you rename or change a setting, keep the previous form working for one studioctl release.

## Shared service support

The [relay](cmd/relay) forwards requests to a shared pdf3 proxy. It adds an [API key](docs/api-keys.md) and the cluster's
service owner to each request. The relay and shared service are not deployed by the current manifests.

The provisioning configuration for [DIS Core](../../../docs/infrastructure/environments.md#dis-core) is in
[`infra/syncroot`](infra/syncroot). The [Flux configuration](infra/syncroot/at22/app.yaml) defines how Flux applies
these resources.

## Development

pdf3 is developed on Linux and macOS. The tests need Docker or Podman. `make help` lists the available targets.

Run `make test-e2e` after you change how PDFs are generated. The test leaves its Kind cluster running, and
`make stop` removes it.

Keep these constraints in mind when changing pdf3:

- Outside CI, the integration tests overwrite their snapshots in `_snapshots/` instead of failing. Review the snapshot
  diff before you commit.
- [`test`](test) is a separate Go module that orchestrates the tests. Add dependencies that the binaries need to the
  root module.
