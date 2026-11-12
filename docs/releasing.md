# Releasing

How to release a component that publishes versioned releases, such as studioctl or the app libraries. A release is a
pull request that promotes the `[Unreleased]` section of the component's `CHANGELOG.md` to a version. The
[releaser](../src/tools/releaser/README.md) creates that pull request. When it merges, the component's
`release-<component>.yaml` workflow runs the releaser, which builds the artifacts, tags the commit and creates a draft
GitHub release for a maintainer to publish.

Run the commands below from `src/tools/releaser`.

## Branches

- `main` carries prereleases, `vX.Y.Z-preview.N`.
- `release/<component>/vX.Y` carries stable and patch releases, `vX.Y.Z`.

Tags are named `<component>/vX.Y.Z`.

The release workflow runs only for a merged pull request with the `release/<component>` label. A pull request from a
fork cannot publish a release, so after it merges, run the component's release workflow by hand on the branch it
merged into.

## Prereleases

1. Merge pull requests with entries under `[Unreleased]` in the component's `CHANGELOG.md`.
2. Run `go run . prepare -component <component> -kind prerelease`. `prepare` takes the next prerelease version from
   the changelog on `main`, and labels the pull request. To start the next release line while the current one is
   being stabilized, add `-line vX.Y`.
3. Approve and merge the pull request.

## Stable releases

### Stabilization

1. Run `go run . prepare -component <component> -kind stabilization`. `prepare` takes the version from the current
   prerelease line on `main`, combines the changelog sections of the line's prereleases, and opens the pull request
   against `release/<component>/vX.Y`. It creates that branch from `main` when it is missing, which requires write
   access. A contributor without it asks a maintainer to create the branch, then runs the command again.
2. Merge the pull request.

### Patches

1. Backport fixes from `main`. `go run . backport -component <component> -commit <sha> -line vX.Y` opens a pull
   request against `release/<component>/vX.Y`. Merge it.
2. Run `go run . prepare -component <component> -kind patch -line vX.Y`.
3. Merge the pull request.

### First release of a component

`prepare` infers the next version from the released sections of the changelog, so it cannot infer the first one. Pass
it for the first release only, such as `-version 9.0.0-preview.1`.

## Running it locally

- `workflow` creates tags and releases only in CI, where `CI=true`. Run it locally with `-dry-run`.
- Dry runs need only Git. Creating pull requests needs an authenticated `gh`.
- The releaser reads release state and base branches from a local remote that points to `Altinn/altinn-studio`, and
  pushes new release branches there. It pushes the branches for release and backport pull requests to your push
  remote, as Git configures it. Remote names do not matter. Set `remote.pushDefault` when several remotes make the
  push remote ambiguous.

## The weekly Altinn Studio release

Altinn Studio itself has no changelog. Every Friday, [release.yaml](../.github/workflows/release.yaml) creates a
GitHub release named `vYYYY.N`, with notes that GitHub generates from the merged pull requests. Run it by hand to create
a draft.
