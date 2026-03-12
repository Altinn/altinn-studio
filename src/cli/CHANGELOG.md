# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
