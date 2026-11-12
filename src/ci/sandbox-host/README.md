# sandbox-host

This crate holds the host setup that Sandbox workloads share inside their pods on the Altinn sandbox nodes. Each job
runs there in its own short-lived microVM. [`sandbox-node`](../sandbox-node/README.md) prepares the nodes themselves.

- `ProviderArguments::run_with_service` opens the Microsandbox Provider with the runtime bundle in the container
  image, after checking it against its published checksum, and runs the workload with it. It takes the Provider home
  from `SANDBOX_PROVIDER_HOME` and the image cache from `SANDBOX_CACHE_HOME`, as described in
  [Provider home and image cache](#provider-home-and-image-cache).
- `validate_immutable_image_reference` accepts only images that are pinned by sha256 digest, so that every Sandbox
  starts the same image. A tag such as `latest` can point to a different image later. Its error names the setting the
  workload read the image from.
- `require_kvm` checks that the process can open `/dev/kvm`, so that a pod without hardware virtualization fails at
  start with a clear error.
- `delete_sandbox` and `delete_sandbox_of` delete a Sandbox, and fail when the delete takes more than one minute.
- `ShutdownSignals` completes on SIGINT or SIGTERM, which tell a workload to stop its Sandbox. The workload then exits
  with `ShutdownSignals::EXIT_CODE`, 143.
- The `sandbox-image` binary prepares an image once, when it is deployed (`export`), and loads it in the init
  container of each pod (`import`). Pods start faster, and they get no registry credentials.
- [`check-runtime-pin.sh`](check-runtime-pin.sh) checks that a Dockerfile downloads the Microsandbox runtime version
  that matches the `microsandbox` crate in `Cargo.lock`, the library that drives it. Each crate that downloads the
  runtime runs it in `make deps-check`.

## Provider home and image cache

Microsandbox keeps its state on the node's local disk, which `sandbox-node` prepares at `/var/lib/altinn/sandbox`. The
pod spec of each workload mounts two folders from it, and `ProviderArguments` only reads the paths it is given:

- The Provider home holds the state of the pod's running VM, so each pod gets its own. The pod mounts the subfolder of
  `/var/lib/altinn/sandbox/homes` that is named after its pod UID (`subPathExpr: $(POD_UID)`) at
  `SANDBOX_PROVIDER_HOME`. No two pods use the same folder, even on the same node.
- The image cache holds the prepared images that the VMs start from. The GitHub runner pods on a node share one cache,
  `/var/lib/altinn/sandbox/cache`, mounted at `SANDBOX_CACHE_HOME`. The init container imports the prepared image into
  it, with a throwaway Provider home in the pod's `/tmp`.

The node keeps a pod's Provider home after the pod ends, and nothing removes it. `run_with_service` therefore empties
the home when the run ends, also when the Provider cannot open or the run fails.

The GitHub runner coordinator in [`src/ci/github-runner`](../github-runner/README.md) uses this crate.

See the [`Makefile`](Makefile) for available development commands. `sandbox-host-build.yaml` runs them in CI.
