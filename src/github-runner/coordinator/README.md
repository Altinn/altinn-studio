# GitHub runner coordinator

This package coordinates one ephemeral GitHub Actions runner through the backend-neutral Sandbox SDK and provides
the `sandbox-image` helper used to export and import prepared images. See the directory-level
[`AGENTS.md`](../AGENTS.md) for design constraints.

Run formatting, strict Clippy, tests and unused-dependency checks:

```sh
make -C src/github-runner/coordinator check
```

Build the coordinator with `src` as its context because it uses path dependencies from `src/experimental`:

```sh
docker build \
  -f src/github-runner/Dockerfile.coordinator \
  -t github-runner-coordinator \
  src
```

Build the runner image from this directory:

```sh
docker build \
  -f src/github-runner/Dockerfile \
  -t github-runner \
  src/github-runner
```
