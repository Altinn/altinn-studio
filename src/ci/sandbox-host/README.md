# sandbox-host

Host setup for Sandbox SDK workloads on the Altinn sandbox nodes:

- `ProviderArguments` opens the Microsandbox Provider from a per-pod home, the shared image cache and the
  preinstalled runtime bundle, and empties the home with `clear_home`.
- `validate_immutable_image_reference` accepts only images that are pinned by digest.
- `require_kvm` checks that the process can open `/dev/kvm`.
- The `sandbox-image` binary exports a prepared image when an image is built, and imports it in the init container
  of a pod, so that the pod gets no registry credentials.
- [`check-runtime-pin.sh`](check-runtime-pin.sh) checks that a Dockerfile downloads the Microsandbox runtime that
  matches `Cargo.lock`. Each crate that downloads the runtime runs it in `make deps-check`.

The GitHub runner coordinator in [`src/ci/github-runner`](../github-runner/AGENTS.md) uses this crate.
