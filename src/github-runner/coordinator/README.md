# GitHub runner coordinator

This package coordinates one ephemeral GitHub Actions runner through the backend-neutral Sandbox SDK and provides
the `sandbox-image` helper used to export and import prepared images. See the directory-level
[`AGENTS.md`](../AGENTS.md) for design constraints.

This package is a member of the repository-level Cargo workspace. Shared Cargo metadata, the lockfile and rustfmt
configuration live at the repository root; the package Makefile remains scoped to the coordinator.

Run formatting, strict Clippy, tests and unused-dependency checks:

```sh
make -C src/github-runner/coordinator check
```

Build the coordinator with the repository root as its context so Cargo can use the root workspace manifest and
lockfile together with the path dependencies from `src/experimental`:

```sh
docker build \
  -f src/github-runner/Dockerfile.coordinator \
  -t github-runner-coordinator \
  .
```

Build the runner image from this directory:

```sh
docker build \
  -f src/github-runner/Dockerfile \
  -t github-runner \
  src/github-runner
```
