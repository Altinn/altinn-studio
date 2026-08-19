# AGENTS.md

This directory contains the GitHub Actions runner image, the host-side coordinator for Sandbox-backed runners and
their Kubernetes deployment configuration.

## Architecture

- `Dockerfile` builds the canonical `github-runner` image with Studio's toolchains and all runner entrypoints. Its
  default entrypoint remains compatible with the existing container runners; the Sandbox coordinator explicitly
  executes `/usr/local/bin/altinn-github-runner-sandbox` inside the guest.
- `coordinator` is a Rust package with two binaries: `coordinator` manages one ephemeral runner Sandbox, while
  `sandbox-image` exports and imports provider-owned prepared images through the generic Sandbox image API.
- Keep the runner lifecycle backend-neutral. It receives a configured `SandboxService`; provider-specific host
  configuration belongs in `coordinator/src/provider.rs`. Do not expose provider cache formats or directory layouts
  to the coordinator, shell scripts or deployment workflow.
- `infra/kustomize` deploys the KEDA `github-runners-sandbox` ScaledJob. Keep the `self-hosted-sandbox` runner label
  and ScaledJob name until workflows and deployed configuration are deliberately migrated.

Published image names describe their contents:

- `github-runner` contains the Actions runner and toolchains used inside the Sandbox.
- `github-runner-coordinator` contains the trusted host coordinator and the `sandbox-image` helper.
- `github-runner-prepared` contains the opaque prepared form of one immutable `github-runner` digest plus its
  importer.

## Prepared-image flow

Prepared images serve two purposes: they avoid pulling and materializing the large runner image in userspace on
every cold node, and they keep registry credentials out of runtime runner Pods.

1. The deployment workflow builds the runner and coordinator images and records their immutable digests.
2. On GitHub-hosted infrastructure, `sandbox-image export` resolves the runner digest using a short-lived ACR token
   and exports the provider-owned prepared representation.
3. `Dockerfile.prepared-image` packages that opaque artifact and its importer as `github-runner-prepared`.
4. On a runner node, kubelet pulls the digest-pinned coordinator and prepared images using the node identity. The
   `prepare-image` init container imports the artifact into the shared provider cache without registry credentials.
5. The coordinator creates a Sandbox for the same runner digest. The Provider resolves it from the imported cache,
   clones private per-Job state and starts the runner entrypoint.

The prepared artifact is derived from an OCI image identity, not a parallel image kind. Its format, integrity
validation, cache key and import/export implementation remain Provider-owned.

## State and credentials

- `SANDBOX_PROVIDER_HOME` is private per Job and contains mutable Provider state and Sandbox roots.
- `SANDBOX_CACHE_HOME` maps through provider composition to the node-local immutable image cache. The Kubernetes
  volume has the generic name `provider-cache`, while its physical host path remains provider-namespaced at
  `/var/lib/altinn/microsandbox-cache` because prepared artifacts are not portable between Providers.
- Multiple coordinators on one node share only the immutable cache. Provider locking and atomic publication must
  handle concurrent imports; workspaces, Docker data, credentials and writable roots are never shared.
- The cache is disposable acceleration. Node replacement or scale-to-zero may remove it without affecting
  correctness, and the cache is never mounted into the guest.
- GitHub App credentials remain in the coordinator. The guest receives only a short-lived runner registration token,
  which is removed from its environment before the Actions runner starts.
- Registry credentials exist only in the GitHub-hosted prepared-image export step. Runtime Pods receive none;
  kubelet authenticates image pulls with the node identity.

## Kubernetes runner shape

- KEDA creates one Kubernetes Job per queued Actions job, with `parallelism: 1`, `completions: 1`, scale-to-zero and a
  maximum of 16 concurrent Jobs.
- Each non-privileged coordinator requests one `devices.altinn.studio/kvm` allocation and runs one private microVM.
  The device plugin exposes multiple logical KVM slots per node; CPU, memory and storage requests provide the normal
  packing limits.
- Schedule only on `purpose=sandbox` nodes. Do not add a KVM hostPath, service-account token or privileged
  coordinator. The only host mount is the narrowly scoped provider cache.
- The prepared-image init container and coordinator share the provider cache but have separate writable provider
  homes. Runtime images are digest-pinned and use `IfNotPresent` so kubelet can reuse its image store safely.
- The two-hour Job deadline bounds the complete runner lifecycle. Cleanup re-authenticates with GitHub because the
  installation token acquired at startup expires after one hour.

## Development

Run the complete Rust verification from the repository root:

```sh
make -C src/github-runner/coordinator check
```

Render the Kubernetes configuration without a cluster:

```sh
kubectl kustomize src/github-runner/infra/kustomize/base
```

Build the runner from `src/github-runner` and the coordinator from `src`; the latter needs the experimental Sandbox
path dependencies included in its build context. Keep workflow image assertions aligned with Kustomize replacements
when changing an image name or annotation.
