# GitHub runner coordinator

The coordinator runs one ephemeral GitHub Actions runner in a Sandbox, through the Sandbox SDK. The package also
builds `sandbox-image`, which exports and imports prepared images. The [runner README](../README.md) describes how it
fits with the rest, and the constraints it keeps.

The Sandbox SDK crates, `sandbox` and `sandbox-microsandbox`, come from
[digdir/digdir-agents](https://github.com/digdir/digdir-agents), pinned by `rev` in the root `Cargo.toml`. Fix bugs in
them there. A pin bump moves that `rev`, `Cargo.lock` and `MICROSANDBOX_RUNTIME_VERSION` in
[Dockerfile.coordinator](../Dockerfile.coordinator) together, and `github-runner-build.yaml` checks that the
Microsandbox versions match.

The two images build with different contexts. Build the coordinator image from the repository root:

```sh
docker build -f src/ci/github-runner/Dockerfile.coordinator -t github-runner-coordinator .
```

Build the runner image with its own directory as context:

```sh
docker build -f src/ci/github-runner/Dockerfile -t github-runner src/ci/github-runner
```
