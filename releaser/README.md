# Releaser

Simple release flow for a component.

## Branches

- `main`: prereleases (`vX.Y.Z-preview.N`)
- `release/<component>/vX.Y`: stable/patch releases (`vX.Y.Z`)

## Prereleases

Example: `v1.1.0-preview.1` -> `v1.1.0-preview.2`
Context: on `main`

1. Land feature PRs with changelog entries in the component `CHANGELOG.md` under `[Unreleased]`.
2. Create a release prep PR:
   - `cd releaser`
   - `go run . prepare -component <component> -version v1.1.0-preview.2`
3. Approve and merge the prep PR.
4. CI workflow runs on merge from `main` and calls:
   - `go run . workflow -component <component> -base-branch main`
5. Workflow resolves the latest prerelease from the component changelog, builds artifacts (if applicable), creates tag `<component>/v...`, and creates a draft prerelease.

## Stable releases

### Stabilization

Example: `v1.0.0-preview.1` -> `v1.0.0`
Context: on `main`

1. Stabilize a release line:
   - `go run . prepare -component <component> -version v1.0.0`
   - `prepare` creates `release/<component>/v1.0` from `main` (errors if it already exists), then creates a prep PR to that branch.
   - changelog is combined from prerelease changelogs for the same line
2. Merge the prep PR; CI creates a non-prerelease stable release from `release/<component>/v1.0`.

### Patching, bugfixing

Example: `v1.0.0` -> `v1.0.1`
Context: on `main`

1. For fixes after stabilization, backport from `main`:
   - `go run . backport -component <component> -commit <sha> -branch v1.0`
   - `backport` creates backport PR targeting `release/<component>/v1.0`
2. Merge backport PR to `release/<component>/v1.0`.
3. Prepare next patch:
   - `go run . prepare -component <component> -version v1.0.1`
4. Merge prep PR; CI publishes patch release.

## Notes

- `workflow` is intended for CI execution. Local usage should be `-dry-run`.
- The workflow job typically requires merged PRs with label `release/<component>`.
- Release publication depends on a component-specific CI workflow being configured.
- Version is resolved from the latest released section in the component changelog on the base branch.
