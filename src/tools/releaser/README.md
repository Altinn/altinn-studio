# Releaser

Simple release flow for a component.

## Supported components

- `studioctl`: uses a Go builder registered by the releaser CLI.
- `app`: uses a Go builder registered by the releaser CLI.
- `fileanalyzers`: has no releaser builder; the GitHub workflow handles package build and publish.

## Builders

Component-specific artifact builders live in the releaser root as `builder_<component>.go`.
Register built-in builders in `builder_00_register.go`.

Components without a builder still support `prepare` and `workflow`; `workflow` creates a changelog-only
GitHub release and leaves artifact build/publish to the component's CI workflow.

## Branches

- `main`: prereleases (`vX.Y.Z-preview.N`)
- `release/<component>/vX.Y`: stable/patch releases (`vX.Y.Z`)

## Prereleases

Example: `v1.1.0-preview.1` -> `v1.1.0-preview.2`
Context: on `main`

1. Land feature PRs with changelog entries in the component `CHANGELOG.md` under `[Unreleased]`.
2. Create a release prep PR:
   - `cd src/tools/releaser`
   - `go run . prepare -component <component> -kind prerelease`
   - `prepare` resolves the next prerelease version from the latest prerelease section in the canonical changelog on `main`.
   - If that release line has entered stabilization, start the next planned line with
     `go run . prepare -component <component> -kind prerelease -line vX.Y`.
     `prepare` verifies that the active line has a canonical release branch, carries its prerelease channel forward,
     and starts the newer line at `<channel>.1`.
3. Approve and merge the prep PR.
4. CI detects the changelog promotion in the canonical `main` push and runs automatically, including for PRs
   from forks. The dispatcher resolves and passes an immutable component, version, commit, and branch plan to the
   selected publisher.
5. The publisher verifies that plan, builds artifacts (if applicable), creates tag `<component>/v...`, and creates a
   draft prerelease.

## Stable releases

### Stabilization

Example: `v1.0.0-preview.1` -> `v1.0.0`
Context: on `main`

1. Stabilize a release line:
   - `go run . prepare -component <component> -kind stabilization`
   - `prepare` resolves `v1.0.0` from the active `v1.0.0-<prerelease>.N` line on `main`.
   - `prepare` creates `release/<component>/v1.0` from `main` when missing, then creates a prep PR to that branch.
   - Creating the canonical release branch requires write access. Contributors can ask a maintainer to pre-create it
     from canonical `main`, then rerun the same command.
   - changelog is combined from prerelease changelogs for the same line
2. Merge the prep PR. CI detects it from the canonical `release/<component>/v1.0` push and creates a
   non-prerelease stable release from that branch.

### Patching, bugfixing

Example: `v1.0.0` -> `v1.0.1`
Context: on `main`

1. For fixes after stabilization, backport from `main`:
   - `go run . backport -component <component> -commit <sha> -line v1.0`
   - `backport` creates backport PR targeting `release/<component>/v1.0`
2. Merge backport PR to `release/<component>/v1.0`.
3. Prepare next patch:
   - `go run . prepare -component <component> -kind patch -line v1.0`
   - `prepare` resolves the next patch version from the latest stable section on `release/<component>/v1.0`.
4. Merge the prep PR. CI detects it from the canonical release-branch push and publishes the patch release.

## Explicit versions

`prepare` still accepts `-version vX.Y.Z` as an escape hatch. Inferred versions are intended for the standard
prerelease, stabilization, and patch release flows.

## Notes

- `workflow` is intended for CI execution. Local usage should be `-dry-run`.
- The configured Git push remote identifies the contributor repository. The releaser uses
  `Altinn/altinn-studio` as the canonical repository for release state and base branches; remote names are not
  significant.
- Push destination follows Git configuration (`branch.<name>.pushRemote`, `remote.pushDefault`, or the branch's
  tracking remote). Configure `remote.pushDefault` when multiple remotes make the destination ambiguous.
- The canonical GitHub repository must have a matching local remote. New release branches are pushed there, while
  contributor prep and backport branches use the configured push remote.
- Dry runs and repository discovery only require Git. Creating pull requests or releases requires an authenticated
  `gh` CLI.
- Automatic publication detects a release promotion by comparing publisher-enabled component changelogs before and
  after a trusted canonical branch push. It does not depend on GitHub PR metadata or labels, so fork and
  same-repository PRs behave alike. Trigger resolution reuses the component registry, branch policy, and
  `Changelog.Promote` semantics in this tool. It emits one immutable component, version, commit, and branch plan, and
  fails if a push adds multiple release sections, promotes multiple components, or does not exactly preserve the
  expected promotion content. The publisher verifies that exact plan against its pinned checkout before releasing.
- The dispatcher intentionally runs on every `main` and `release/**` push and lets `resolve-trigger` no-op when no
  promotion is present. GitHub path filters inspect at most 300 changed files and could otherwise miss a release in
  a large push.
- Manual workflow dispatch is a recovery path. Select the component, enter the exact promoted version and full
  commit SHA, and dispatch from `main` or the matching `release/<component>/vX.Y` branch. A matching existing draft
  release is updated in place so retries can continue after a later publication step fails.
- The Go trigger policy is the publication source of truth. The component registry selects the reusable publisher;
  version policy maps `preview` releases to the `dev` environment, `rc` releases to `staging`, and stable releases to
  `prod`. Unknown prerelease channels fail closed during trigger resolution.
- Publisher workflows serialize releases for the same component and base branch with GitHub's maximum pending queue,
  without cancelling an in-progress publication. Different components and release lines can still publish
  independently.
- Manual dispatch validates the exact selected version against the selected commit and branch; publishers never
  select a newer version or move their checkout while executing a release plan.
