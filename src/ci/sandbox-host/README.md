# sandbox-host

Some workloads run code that must not reach the host they run on, such as GitHub Actions jobs. They start each job in
its own short-lived microVM, a Sandbox, on the Altinn sandbox nodes. This crate is the host setup those workloads share
to start Sandboxes safely. [`sandbox-node`](../sandbox-node/README.md) prepares the nodes themselves.

- `ProviderArguments` opens the Microsandbox Provider with the runtime bundle in the container image, after checking
  it against its published checksum. Each pod gets its own Provider home, and the pods on a node share one image
  cache. `clear_home` empties the pod's home after a run, so that nothing carries over to the next one.
- `validate_immutable_image_reference` accepts only images that are pinned by sha256 digest, so that every Sandbox
  starts the same image. A tag such as `latest` can point to a different image later.
- `require_kvm` checks that the process can open `/dev/kvm`, so that a pod without hardware virtualization fails at
  start with a clear error.
- The `sandbox-image` binary prepares an image once, when it is deployed (`export`), and loads it in the init
  container of each pod (`import`). Pods start faster, and they get no registry credentials.
- [`check-runtime-pin.sh`](check-runtime-pin.sh) checks that a Dockerfile downloads the Microsandbox runtime version
  that matches the `microsandbox` crate in `Cargo.lock`, the library that drives it. Each crate that downloads the
  runtime runs it in `make deps-check`.

The GitHub runner coordinator in [`src/ci/github-runner`](../github-runner/AGENTS.md) uses this crate.

See the [`Makefile`](Makefile) for available development commands. `sandbox-host-build.yaml` runs them in CI.
