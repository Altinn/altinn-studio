# sandbox-host

Host setup for Sandbox SDK workloads on the Altinn sandbox nodes:

- `ProviderArguments` opens the Microsandbox Provider from a per-pod home, the shared image cache and the
  preinstalled runtime bundle, and empties the home with `clear_home`.
- `validate_immutable_image_reference` accepts only images that are pinned by digest.
- `require_kvm` checks that the process can open `/dev/kvm`.
- The `sandbox-image` binary exports a prepared image when an image is built, and imports it in the init container
  of a pod, so that the pod gets no registry credentials.

The GitHub runner coordinator in [`src/ci/github-runner`](../../../ci/github-runner/AGENTS.md) and the
[assistant runner](../../../AI/assistant-runner/README.md) use this crate.
