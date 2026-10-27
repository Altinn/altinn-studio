# Releaser

The releaser releases the components of this repository that publish versioned releases, such as studioctl and the
app libraries. Each component's `CHANGELOG.md` is the source of its version. [Releasing](../../../docs/releasing.md)
says how to release a component with it.

[`component.go`](internal/component.go) lists the components and their changelogs. The releaser builds and attaches
the artifacts of a component with a builder, registered in [`builder_00_register.go`](builder_00_register.go). For a
component without one, `workflow` creates a release with only the changelog, and the component's workflow builds and
publishes the packages. A `RELEASE_NOTES_INTRO.md` beside a component's changelog goes at the top of each of its
release notes.

CI also runs the releaser on pull requests. [`changelog.yml`](../../../.github/workflows/changelog.yml) checks every
changed changelog with `validate-changelogs`, and [`cli-changelog.yaml`](../../../.github/workflows/cli-changelog.yaml)
requires a studioctl changelog entry with `validate-changelog`.

## Development

`make test` leaves out the end-to-end tests in [`test/e2e`](test/e2e), which cross-compile the builders. CI runs them
with `make test-e2e`.

The workflows that build the [GitHub runner image](../../ci/github-runner/Dockerfile) take its Go version from this
module's `go.mod`, so changing that version rebuilds and redeploys the runners.
