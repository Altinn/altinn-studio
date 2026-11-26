# sandbox-hosting

This crate holds the host setup that Sandbox workloads share inside their pods on the Altinn sandbox nodes. Each job
runs there in its own short-lived microVM. [`sandbox-node`](../sandbox-node/README.md) prepares the nodes themselves.

A workload gets from it:

- The Microsandbox Provider, opened with the runtime bundle in the container image after a check against the bundle's
  published checksum.
- Checks that make a pod fail at start with a clear error: that it can use `/dev/kvm`, and that its Sandbox image is
  pinned by digest. A tag such as `latest` can point to a different image later.
- A time limit for deleting a Sandbox, and the signals that tell the workload to stop it.
- The `sandbox-image` binary, which prepares an image once when it is deployed and loads it in the init container of
  each pod. Pods start faster, and they get no registry credentials.

An image that runs Sandboxes downloads the Microsandbox runtime of the version that `Cargo.lock` has for the
`microsandbox` crate, the library that drives it, as [Dockerfile.coordinator](../github-runner/Dockerfile.coordinator)
does.

## Provider home and image cache

Microsandbox keeps its state on the node's local disk, which `sandbox-node` prepares at `/var/lib/altinn/sandbox`. The
pod spec of each workload mounts two folders from it, and `ProviderArguments` only reads the paths it is given:

- The Provider home holds the state of the pod's running VM, so each pod gets its own. The pod mounts the subfolder of
  `/var/lib/altinn/sandbox/homes` that is named after its pod UID (`subPathExpr: $(POD_UID)`) at
  `SANDBOX_PROVIDER_HOME`. No two pods use the same folder, even on the same node.
- The image cache holds the prepared images that the VMs start from. The GitHub runner pods on a node share one cache,
  `/var/lib/altinn/sandbox/cache`, mounted at `SANDBOX_CACHE_HOME`. The operator runner pods share its `operator-runner`
  subfolder. The init container imports the prepared image into it, with a throwaway Provider home in the pod's `/tmp`.

The node keeps a pod's Provider home after the pod ends, and nothing removes it. `ProviderArguments` therefore empties
the home when the run ends, also when the Provider cannot open or the run fails.

The GitHub runner coordinator in [`src/ci/github-runner`](../github-runner/README.md) and the
[operator runner](../../core/operator-runner/README.md) of the core operator use this crate.

See the [`Makefile`](Makefile) for available development commands. `sandbox-hosting-build.yaml` runs them in CI.
