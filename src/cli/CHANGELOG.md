# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries should describe only user-facing functionality in clear, user-friendly language; omit implementation details that do not affect how people use the product.
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Changed

- Wait up to 30 seconds for an app to become reachable through Localtest when using `studioctl run`; use `--startup-timeout` to choose a different limit.

### Fixed

- Explain access errors during `studioctl app upgrade`

## [0.1.0-preview.19] - 2026-08-06

### Added

- Auto-migrate the Correspondence APIs removed in v9 in `studioctl app upgrade v9`: drop the builder calls and properties v8 already discarded, rename `CustomRecipient` to the `CustomRecipients` list, rename the removed builder step interface, wrap a byte payload passed to `WithData` in a `MemoryStream`, and replace the two superseded payload constructors with `CorrespondenceAuthenticationMethod`. Every rewrite is listed for review.
- Warn in `studioctl app upgrade v9` about the Correspondence changes that have no mechanical fix — the recipient-override methods, the wrapper-based recipient list, and `IsReserved` — plus anything the auto-migration could not rewrite safely.

### Changed

- Update the workflow-engine image used by `studioctl env up` to a version with durable-yield support: service tasks can wait for external outcomes (for example a delivery confirmation) without occupying a worker or being treated as failures.
- Refuse to start `studioctl app upgrade` when the git repository has local changes, so the upgrade lands as one clean reviewable changeset.
- Rename `OrganisationLookup` components and their data model bindings to `OrganizationLookup` when running `studioctl app upgrade v9`.
- Stage every change from `studioctl app upgrade` in one `git add -A` pass once the upgrade is done. Previously, some migration steps staged their changes, while others did not.
- Point `studioctl app upgrade v9` removed-API warnings at the offending call rather than the start of the enclosing expression.

### Fixed

- Keep subforms identifiable when running `studioctl app upgrade v9`.
- Prefer the latest stable v9 app packages in `studioctl app upgrade v9`, falling back to the latest preview until a stable version is available.

## [0.1.0-preview.18] - 2026-07-24

### Added

- Handle the v9 C# breaking changes in `studioctl app upgrade v9`: auto-fix package-version floors (NU1605), the `IServiceTask` namespace move, and the `IEFormidlingReceivers.GetEFormidlingReceivers` signature; warn (exit code `3`) about removed APIs that need manual porting — the legacy task event interfaces (`IProcessTaskStart`/`End`/`Abandon`, `ITaskEvents`), the reworked `ServiceTaskResult` factories, and legacy eFormidling code.
- Warn in `studioctl app upgrade v9` about `feedback` tasks placed directly after a service task in the BPMN process. In v9 the process waits on the service task itself, so such feedback tasks are usually a leftover v8 waiting pattern that should be reviewed and removed manually.

## [0.1.0-preview.17] - 2026-07-23

### Added

- Notify when a newer `studioctl` release is available. The check runs at most once every few hours, caches its result under the studioctl home directory, and prints a hint to run `studioctl self update`. It is skipped in CI, for non-interactive output, and can be disabled with `STUDIOCTL_NO_UPDATE_CHECK=1`.

### Changed

- Update workflow-engine image.

## [0.1.0-preview.16] - 2026-07-02

### Changed

- Show the resolved target version during `studioctl self update` and skip the update when already on the newest version, instead of reinstalling and restarting the local environment.

## [0.1.0-preview.15] - 2026-07-01

### Changed

- Color the `studioctl env` progress footer by status: the ready count is green when all resources are ready, yellow when some are, and red when none are; the failed count is dimmed when zero and red otherwise.

### Fixed

- Update `studioctl app upgrade v9` to rewrite the app `Dockerfile` .NET base images to match the upgraded target framework (`net10.0`).

## [0.1.0-preview.14] - 2026-06-08

### Changed

- Update localtest PDF worker image.

## [0.1.0-preview.13] - 2026-06-05

### Added

- Add `studioctl app env` for printing the local app harness environment, with `--json` output for app startup integration.

### Fixed

- Update `studioctl app upgrade v9` to target `net10.0` and resolve v9 app package versions from configured NuGet sources.
- Update `studioctl app upgrade v9` to replace legacy IIS Express launch settings with the standard `App` project launch profile.

## [0.1.0-preview.12] - 2026-06-04

### Added

- Show resolved container runtime client/server versions in `studioctl doctor`.

### Changed

- Update localtest and workflow-engine images.

### Fixed

- Ignore stale Podman container health status when no healthcheck command is configured.
- Warn in `studioctl doctor` when the Podman CLI client/server versions differ.
- Run localtest PDF and workflow-engine service containers with their image default user to avoid Podman `keep-id` group mapping failures on macOS.

## [0.1.0-preview.11] - 2026-05-29

### Added

- Add `apps search` for discovering app repositories in Altinn Studio.

### Fixed

- Support starting localtest with rootless Podman setups where the host user has a large domain UID/GID outside the default subordinate ID mapping.
- Relabel localtest bind mounts on SELinux-enabled Podman setups so containers can read generated resources.

## [0.1.0-preview.10] - 2026-05-22

### Changed

- Update localtest image.

### Fixed

- Fix Windows PowerShell installer architecture detection.
- Make Windows installs fall back to the default location when no usable interactive prompt is available.
- Support `studioctl self update` and `studioctl self uninstall` on Windows by completing binary replacement/removal after the running process exits.
- Render plain output in Windows PowerShell ISE to avoid unreadable ANSI codes and spinner/status glyphs.
- Clean up stale `studioctl` update artifacts from the Windows install directory during uninstall.

## [0.1.0-preview.9] - 2026-05-22

### Added

- Add `studioctl auth login --with-token` for logging in with an existing Studio/Designer API key from standard input.

### Changed

- Update localtest image.

## [0.1.0-preview.8] - 2026-05-13

### Changed

- Breaking: make `--follow` default to `false` for log commands.
- Breaking: rename `studioctl servers` to `studioctl server`.
- Breaking: simplify install scripts by removing `--repo`, `--asset`, `--skip-resources`, `STUDIOCTL_REPO`, `STUDIOCTL_ASSET`, and `STUDIOCTL_SKIP_RESOURCES`.
- Rename `app-manager` to `studioctl-server`, including install/update migration cleanup of legacy runtime files, installed payload, and logs.
- Show progress while `app run --mode container` pulls/builds and starts the app container.
- `studioctl self uninstall` now asks for confirmation; use `-y` or `--yes` for non-interactive uninstall.
- `studioctl auth` uses login through web browser/auth code and Ansattporten session to create Studio API key.

### Fixed

- Redirect unauthenticated app URLs opened from `studioctl app run` through the localtest login page.
- Keep running apps visible in localtest after restarting the localtest environment.
- Improve localtest resource reconciliation so `env up` removes managed resources that are no longer requested, such as pgAdmin or monitoring, without restarting unchanged core containers.

## [0.1.0-preview.7] - 2026-04-29

### Added

- Add `env reset` for localtest to delete persisted localtest and workflow-engine database data, with interactive confirmation.
- Add `env hosts add`, `env hosts remove`, and `env hosts status` for localtest, including managed hosts-file blocks, backup creation, and `--json` output.

### Changed

- Make `--random-host-port` default to `true` for `run` and `app run`.
- Stop running apps, localtest, and app-manager before `self update`, `self uninstall`, and installer replacement.
- Make `self uninstall` remove studioctl home data and env runtime resources.

### Fixed

- Fix install and update flows when no interactive terminal prompt is available.
- Fix workflow-engine database persistence cross-platform support by using a named/managed volume instead of host bind mount.
- Fix app-manager shutdown waits incorrectly reporting that an exited process is still running on Linux systems.
- Reading password input when using `studioctl auth` now works on macOS with bracketed paste enabled.

### Removed

- Breaking: remove `--checks` from `studioctl doctor`; `studioctl doctor` now always runs localtest environment diagnostics and reports localtest, PDF, and workflow-engine health in text and JSON output.

## [0.1.0-preview.6] - 2026-04-20

### Added

- Add `--json` output for `app build`.
- Add `--json` output for `env up`, `env down`, `env status`, and `env logs`.
- Add `--json` output for `servers up`, `servers status`, and `servers down`.
- Add `--json` output for detached `run` and `app run`.
- Add `app ps` for listing running app processes and containers.
- Add `app stop` and top-level `stop` for stopping discovered app processes and containers.
- Add `app logs` for reading app process and container logs.
- Support for multiple instances of the same app and roundrobin loadbalancing similar to deployed environments.

### Changed

- Rename app run mode `native` to `process`.

## [0.1.0-preview.5] - 2026-04-16

### Added

- Windows support, including Podman Desktop
- Support for running apps as containers with `studioctl run --mode container`

### Changed

- Improve networking reliability across runtime configurations
- `studioctl run` now waits for the app to be ready before returning

## [0.1.0-preview.4] - 2026-03-12

### Added

- Colima support

### Changed

- Update localtest images
- Improve `env` output and progress visibility

### Fixed

- Improve `doctor` and `env localtest` container toolchain detection

## [0.1.0-preview.3] - 2026-02-27

### Fixed

- Update to latest PDF container image, to resolve connectivity issues (#17988)

## [0.1.0-preview.2] - 2026-02-27

### Added

- Support `self update` and `self uninstall` for Linux, macOS

### Fixed

- PDF connectivity when running `env localtest` (#17959)
- Handle partial "up" state in `env up` (#17959)

## [0.1.0-preview.1] - 2026-02-25

### Added

- Initial implementation of studioctl CLI tool (#17841)
