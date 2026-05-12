# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Changed

- Breaking: make `--follow` default to `false` for log commands.
- Breaking: rename `studioctl servers` to `studioctl server`.
- Rename `app-manager` to `studioctl-server`, including install/update migration cleanup of legacy runtime files, installed payload, and logs.
- Show progress while `app run --mode container` pulls/builds and starts the app container.

### Fixed

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
