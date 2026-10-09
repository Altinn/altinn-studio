# GitHub runner coordinator

This package coordinates one ephemeral GitHub Actions runner through the backend-neutral Sandbox SDK and provides
the `sandbox-image` helper used to export and import prepared images. See the directory-level
[`AGENTS.md`](../AGENTS.md) for design constraints.

See the [`Makefile`](Makefile) for available development commands.

The Sandbox SDK crates, `sandbox` and `sandbox-microsandbox`, come from
[digdir/digdir-agents](https://github.com/digdir/digdir-agents), pinned by `rev` in the root `Cargo.toml`; fix them
there. A pin bump moves that `rev`, `Cargo.lock` and `MICROSANDBOX_RUNTIME_VERSION` in
[`Dockerfile.coordinator`](../Dockerfile.coordinator) together, and `github-runner-build.yaml` checks that the
Microsandbox versions match.

Build the coordinator image from the repository root:

```sh
docker build \
  -f src/ci/github-runner/Dockerfile.coordinator \
  -t github-runner-coordinator \
  .
```

Build the runner image from the repository root:

```sh
docker build \
  -f src/ci/github-runner/Dockerfile \
  -t github-runner \
  src/ci/github-runner
```
