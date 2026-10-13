# pdf3

pdf3 generates PDFs of Altinn app pages using headless Chrome. In runtime clusters, a proxy accepts
requests from apps and sends them to workers that control Chrome through the Chrome DevTools
Protocol. Separating the proxy from the workers lets routing and browser workloads scale
independently and keeps browser failures separate from the entry point. The
[architecture decision](../../../docs/adr/2025-10-22-pdf-generation-architecture.md) records why
this design was chosen; the [topology diagram](docs/topology.excalidraw.svg) shows the connections.

The [proxy](cmd/proxy/main.go) handles request validation and retries when workers are full. The
[worker](cmd/worker/main.go) handles generation and, where enabled, PDF/A conversion. For the
request contract, follow the [request types and validation](internal/types/pdf.go) rather than
maintaining a separate API reference here.

Browser sessions are reused, so cleanup between requests is essential to keep one user's cookies
and page state out of the next request. Changes to rendering or browser lifecycle must preserve
that isolation as well as PDF output. The [session implementation](internal/generator/browser_session.go)
and [cookie isolation test](test/integration/simple/simple_test.go) are the places to check it.

## Development and testing

Use Linux or macOS, a container runtime (Docker or Podman), and the Go version declared in
[go.mod](go.mod) and the [test module](test/go.mod). Run commands from this directory.

The [Makefile](Makefile) is the command reference; `make help` lists its documented targets.
For a code change, start with:

```sh
make build
make check
```

`make check` also updates module files and formats code, so review the resulting diff. Production
and test orchestration have separate Go modules: keep dependencies used only by the fixture in
the test module. The [build workflow](../../../.github/workflows/runtime-pdf3-build.yml) defines
the checks run in CI.

Run `make test-e2e` after changes to PDF generation, browser lifecycle, or the worker image.
The [test runner](test/cmd/tester/main.go) builds the images and deploys them through Flux into a
local Kind cluster using the shared [runtime fixture](../devenv/README.md). This exercises the
container and deployment configuration as well as the Go code. The command keeps the cluster
running for investigation; use `make stop` when finished.

Review snapshot changes after running tests. The [snapshot helper](test/harness/snapshot.go)
writes snapshots during local runs and compares them when `CI` is set. A successful local run
alone does not establish that PDF output stayed the same. The runner saves proxy and worker logs
in `test/logs/` to help investigate failures.

For performance changes, use the load test targets in the Makefile. They require k6; the
remote-environment test also uses a local browser and the settings in [.env.sample](.env.sample).
That runner currently looks for a Linux browser binary, so use Linux for this test and install
Node.js/npm for the browser download.
The runner loads those settings from an untracked `.env` file. `make browser` downloads the
browser used by that test. It does not replace the browser in the worker image.

On Linux, if the downloaded browser fails to start, `ldd <binary>` can identify missing shared libraries.
On Arch Linux, including WSL installations, these packages may be needed:

```sh
sudo pacman -S nss at-spi2-core libxcomposite libxdamage libxrandr libxkbcommon mesa alsa-lib
```

## Deployment and configuration

The [deployment workflow](../../../.github/workflows/deploy-runtime-pdf3.yaml) builds the proxy
and worker images, packages the Kustomize manifests as an OCI artifact, and tags that artifact
for runtime rings. The runtime [Flux resources](../../../infra/runtime/syncroot/base/pdf3.yaml)
select the artifact using the cluster's upgrade channel and apply its environment overlay.
This is also the deployment path for production; the
[production overlay](infra/kustomize/prod/kustomization.yaml) holds its component configuration.

The [base manifests](infra/kustomize/base/kustomization.yaml) link to the deployment settings
and network policies. Check those manifests together with the
[configuration reader](internal/config/config.go) when changing configuration. Resource limits,
replica counts, timeouts, and setting defaults belong in their source files rather than in a
second list here.

For shutdown changes, read the [host lifecycle contract](internal/runtime/runtime.go) together
with the pod termination settings. Readiness draining and process shutdown must agree so that
requests can finish while a pod is being replaced.

### Compatibility with studioctl

Local app development has a different deployment path from the Kind test fixture. In its default
mode, `studioctl env up` runs the worker directly in a container, using the image chosen in
[studioctl's image configuration](../../cli/internal/config/images.go). Its `tt02` tag moves when
the deployment workflow tags the runtime ring that tt02 serves. This lets local app development
pick up PDF changes without waiting for a studioctl release. In development mode, studioctl
builds the worker from the configured checkout instead; the
[pdf3 component](../../cli/internal/cmd/env/localtest/components/pdf.go) defines both paths and
the configuration supplied to the container.

In runtime clusters, configuration is packaged with the service. Locally, an installed studioctl
supplies it and can be older than the worker image it downloads. When renaming a setting supplied
by studioctl, keep its previous spelling working for one studioctl release. Check both the
configuration reader and the studioctl component when changing that contract.

For telemetry changes, start with the [attribute vocabulary](internal/telemetry/attr/attr.go)
and [request attributes](internal/telemetry/request_attributes.go). The vocabulary documents why
spans and log records share attribute names. To inspect signals locally, follow the
[local observability guide](../../../infra/observability/local/README.md).
