# Sandbox runner coordinator

This package runs one ephemeral GitHub Actions runner through the backend-neutral Sandbox SDK. The
runner lifecycle receives a constructed `SandboxService`; the currently deployed provider is
composed separately in `provider.rs`. GitHub App credentials remain in the coordinator, and the
guest receives only a short-lived runner registration token.

The coordinator requires an immutable `SANDBOX_IMAGE` reference, creates a direct ext4 guest
root, streams runner output, handles SIGINT and SIGTERM, deletes the Sandbox, and removes any stale
GitHub runner registration. The guest image is built with `Dockerfile.sandbox`; its entrypoint starts
dockerd on the guest ext4 root and requires the `overlay2` storage driver before registering the
runner.

`SANDBOX_PROVIDER_HOME` contains private per-Job state. `SANDBOX_CACHE_HOME` selects the node-local
immutable image cache shared by coordinator Jobs. Only the provider composition translates these
generic host paths into concrete Provider configuration.

CI materializes the guest image once and publishes its provider-owned representation as a separate,
digest-pinned ACR init image. Kubelet pulls that image with the node identity. Its
`sandbox-image` entrypoint asks the Sandbox image facade to validate and import the opaque artifact
into `SANDBOX_CACHE_HOME` before the coordinator starts. The helper does
not know the Provider's cache layout or prepared-image format. The coordinator therefore neither receives
registry credentials nor pulls and materializes the original OCI layers on a cold node.

The coordinator image contains the checksum-verified `0.6.9-digdir.2` Microsandbox runtime bundle.
The provider installs it from the local image instead of downloading host runtime binaries when a
Job starts. An online runner that does not claim a queued job within ten minutes is deregistered and
deleted so redundant KEDA scale-outs do not remain idle.

Run the same format, strict Clippy, test and unused-dependency checks as the experimental Rust
workspace:

```sh
make -C src/github-runner/coordinator check
```

Build the coordinator with `src` as the build context because it uses path dependencies under
`src/experimental`:

```sh
docker build \
  -f src/github-runner/Dockerfile.coordinator \
  -t github-runner-sandbox-coordinator \
  src
```

Build the guest from `src/github-runner`. The normal runner deployment workflow publishes
`altinntjenestercontainerregistry.azurecr.io/altinn-studio/github-runner:latest`, which is the
guest's base image. Use `--pull` to resolve the current base:

```sh
docker build \
  --pull \
  -f Dockerfile.sandbox \
  -t github-runner-sandbox-guest:TAG .
```

The deployment workflow publishes the base, guest, coordinator and prepared-image init image to ACR.
Runtime manifests use immutable guest, coordinator and prepared-image digests. Only the CI export step
receives a short-lived ACR access token; runtime pulls use the kubelet identity.

The `github-runners-sandbox` KEDA ScaledJob schedules non-privileged coordinators on `sandboxpool`.
Each coordinator requests one logical KVM slot and runs one ephemeral GitHub Actions runner inside
one private microVM. Up to eight coordinators can share a node; the node-local immutable image cache
is shared, while provider homes, guest roots and credentials remain private to each Job.
