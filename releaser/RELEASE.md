# studioctl release strategy (src/cli)

Scope: `studioctl` (Go), `app-manager` (.NET), `localtest-resources.tar.gz`, and install scripts in `src/cli/cmd/studioctl/`. Manual GitHub Releases in `Altinn/altinn-studio`. Minimal external dependencies.

## 1) Purpose and scope

This document defines how the CLI is released, which branches/tags are allowed, which assets are required, and how the stable install endpoints are served.

## 2) Development flow (features)

- Feature branches -> PRs to `main`
- Each feature PR updates `src/cli/CHANGELOG.md` under `[Unreleased]`
- PRs to `main` are **squash-merged**

## 3) Release types (single source of truth)

| Release type | Source branch | Tag format | PR target | Command |
| --- | --- | --- | --- | --- |
| Preview | `main` | `studioctl/vX.Y.Z-preview.N` | `main` | `make release-prepare VERSION=vX.Y.Z-preview.N` |
| Stable (new minor/major) | `main` -> new `release/studioctl/vX.Y` | `studioctl/vX.Y.Z` | `release/studioctl/vX.Y` | `make release-prepare VERSION=vX.Y.0` |
| Patch (backport) | `release/studioctl/vX.Y` | `studioctl/vX.Y.Z` | `release/studioctl/vX.Y` | `make release-prepare VERSION=vX.Y.Z` |

Notes:
- Previews are always built from `main`.
- Stable releases are always built from a release branch.
- Patch releases require an existing release branch.

## 4) Invariants

### 4.1 Versioning and tags

- SemVer 2.0.
- Component tags only:
  - Stable: `studioctl/vX.Y.Z`
  - Preview: `studioctl/vX.Y.Z-preview.N`
- Embedded version format: **`vX.Y.Z` only** (the workflow strips `studioctl/`).
- Install scripts accept `vX.Y.Z` or `studioctl/vX.Y.Z` for `--version`; prefixes are stripped.
- `releases/latest` must resolve to the latest **stable** release.
- Do not delete published releases. “Active” means “latest stable/preview,” not “only one exists.”

### 4.2 Changelog rules

- File: `src/cli/CHANGELOG.md`.
- Required structure:
  - `## [Unreleased]`
  - `## [X.Y.Z] - YYYY-MM-DD`
  - `## [X.Y.Z-preview.N] - YYYY-MM-DD`
  - Within each version: `### Added/Changed/Fixed/Removed`
- Scope entries to `src/cli/` only.
- CI validation (on PRs touching `src/cli/`):
  - `src/cli/CHANGELOG.md` must be modified.
  - Must contain `[Unreleased]`.
- To skip validation, add the `skip-changelog` label (docs-only or non-release-impacting changes).

### 4.3 Branching and backports

- Release branches: `release/studioctl/vX.Y` (stable lines only).
- **No merges from `main` into release branches.**
- Backports are PRs targeting the release branch.
- Backport PRs are **rebase-merged** so the release branch contains the original squash commit (or an exact patch-equivalent rebased commit). This keeps history linear and auditable.
- Use `git cherry-pick -x` for provenance when manual backporting, and reference original SHAs/PRs in the backport PR description.

### 4.4 Required release assets

Install scripts (exact names):
- `install.sh`
- `install.ps1`

studioctl binaries (exact names):
- `studioctl-linux-amd64`
- `studioctl-linux-arm64`
- `studioctl-darwin-amd64`
- `studioctl-darwin-arm64`
- `studioctl-windows-amd64.exe`
- `studioctl-windows-arm64.exe`

app-manager bundles (reserved names; **not built until studioctl consumes them**):
- `app-manager-linux-amd64.tar.gz`
- `app-manager-linux-arm64.tar.gz`
- `app-manager-darwin-amd64.tar.gz`
- `app-manager-darwin-arm64.tar.gz`
- `app-manager-windows-amd64.zip`
- `app-manager-windows-arm64.zip`

Localtest resources:
- `localtest-resources.tar.gz`

Checksums:
- `SHA256SUMS` (covers all assets above)

Install script verification requirements:
- Download `SHA256SUMS`, verify the binary **before** executing `studioctl self install`.
- On checksum mismatch: print expected vs actual and exit with code 1.
- If `SHA256SUMS` cannot be downloaded, the asset is missing from it, or no SHA256 tool exists: fail with a clear error (unless `--skip-checksum` / `-SkipChecksum` is set).

### 4.5 Stable install endpoints (Designer backend)

The Designer backend (`src/Designer/backend/`) serves stable install scripts for public docs.

| Endpoint | Description |
| --- | --- |
| `https://altinn.studio/designer/api/v1/studioctl/install.sh` | Bash install script (latest stable) |
| `https://altinn.studio/designer/api/v1/studioctl/install.ps1` | PowerShell install script (latest stable) |

Behavior:
- `v1` is the API contract version, not the studioctl version.
- Serves the script content directly (not a redirect).
- Always serves scripts from the latest stable GitHub release (`releases/latest`).
- Cached/proxied to survive GitHub outages.

Implementation requirements:
- Endpoint location: `src/Designer/backend/`.
- Source: `https://github.com/Altinn/altinn-studio/releases/latest/download/install.sh` (and `.ps1`).
- Cache strategy: stale-while-revalidate, 1h background refresh TTL.
- Cache storage: in-memory `IMemoryCache`.
- Error handling: return 503 only if **no** cached content exists at all.
- Bootstrap: return 404 until the first studioctl release exists.

Documentation:
- Public docs use these stable URLs; updates are manual.

```bash
# Unix/macOS/Linux
curl -fsSL https://altinn.studio/designer/api/v1/studioctl/install.sh | bash

# Windows PowerShell
irm https://altinn.studio/designer/api/v1/studioctl/install.ps1 | iex
```

## 5) Release process (by goal)

### 5.1 Preview release (from `main`)

1. Ensure `[Unreleased]` contains preview notes.
2. From a clean working tree (the tool checks out `main`), run `make release-prepare VERSION=vX.Y.Z-preview.N`.
3. Review and merge the PR to `main` (label: `studioctl-release`).
4. CI drafts a GitHub **Pre-release**.
5. Verify the draft and **Publish**.

### 5.2 New stable release (new minor/major)

1. Ensure `[Unreleased]` contains stable notes.
2. From a clean working tree (the tool checks out `main`), run `make release-prepare VERSION=vX.Y.0`.
   This creates `release/studioctl/vX.Y` and opens a PR targeting it.
3. Review and merge the PR to `release/studioctl/vX.Y` (label: `studioctl-release`).
4. CI drafts the GitHub release.
5. Verify the draft and **Publish**.

### 5.3 Patch release (backport)

1. From a clean working tree (the tool checks out `release/studioctl/vX.Y`), create a backport PR:

   ```bash
   cd src/cli
   make backport COMMIT=<commit-sha> BRANCH=vX.Y
   ```

   This cherry-picks the commit (excluding changelog changes), inserts entries into `[Unreleased]`, and opens a PR to `release/studioctl/vX.Y`.
2. Rebase-merge the backport PR to `release/studioctl/vX.Y` (label: `backport`).
3. From a clean working tree (the tool checks out `release/studioctl/vX.Y`), run `make release-prepare VERSION=vX.Y.Z`.
4. Merge the release PR (label: `studioctl-release`).
5. Verify and publish the draft release.

Note: Backported entries may appear in both preview and patch releases. This is expected.

## 6) CI release workflow (single path)

Workflow: **`release-studioctl.yaml`**

Triggers:
- PR with label `studioctl-release` is merged to `main` or `release/studioctl/v*`.
- Version is parsed from PR title: `Release studioctl vX.Y.Z`.

Behavior:
- Validates tag format and that the tag does **not** already exist.
- Enforces ref policy:
  - Preview tags must be on `main`.
  - Stable tags must be on `release/studioctl/vX.Y`.
- Validates the changelog section exists (fails if missing).
- Extracts release notes from `src/cli/CHANGELOG.md`.
- Builds all artifacts and `SHA256SUMS` in CI only (CGO_ENABLED=0).
- Validates `localtest-resources.tar.gz` contains `testdata/` and `infra/`.
- Creates a **draft** GitHub release, uploads assets.
- Preview releases are marked “Pre-release.”

## 7) Verification and rollback

Manual verification (before publishing):
1. Run install script from the draft release.
2. Verify `studioctl --version` matches expected version.
3. Verify `studioctl self install` downloads correct resources.
4. Spot-check `SHA256SUMS` vs downloaded binaries.

Rollback:
- Do not delete published releases.
- Fix by releasing a new patch version.
- If a draft is broken: delete the draft, fix, and re-trigger.

## 8) Appendix: Make targets

- `make release-prepare VERSION=vX.Y.Z`: Create changelog promotion PR.
- `make release-backport COMMIT=<sha> BRANCH=vX.Y`: Backport with changelog handling.
- `make release-workflow TAG=studioctl/vX.Y.Z`: Run complete release workflow (for CI).
- `make resources`: Build `localtest-resources.tar.gz`.

All release targets support `DRY_RUN=-dry-run` for local testing.

## 9) Appendix: Testing strategy

- Changelog parsing: `src/cli/internal/changelog` with unit tests.
- Release tag parsing: `src/cli/internal/release/tag_test.go`.
- Release workflow unit tests: `src/cli/internal/release/workflow_test.go` (branch policy, changelog validation, asset upload).
- Release workflow dry-run: `src/cli/test/e2e/workflow_test.go` (cross-compiles all platforms).
- Designer install script proxy: `src/Designer/backend/tests/Designer.Tests/Services/StudioctlInstallScriptServiceTests.cs`.
- Dry-run: `make release-prepare VERSION=vX.Y.Z --dry-run` to validate preconditions.
- All releases are drafts first; delete/retry on issues.
