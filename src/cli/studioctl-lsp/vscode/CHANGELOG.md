# Changelog

All notable changes to the Altinn Studio Language Server extension for VS Code
will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Initial release: language client for the Altinn app-config language server (`studioctl app lsp`) with diagnostics, hover, go-to-definition, find-references, rename, completion, quick fixes, and reference code lenses across app config files, layouts, texts, process definitions, and C# data models.

### Fixed

- Removed `--stdio` from `studioctl app lsp` launch arguments.
