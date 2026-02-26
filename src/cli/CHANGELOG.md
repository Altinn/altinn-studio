# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial implementation of studioctl CLI tool
- Automated upgrades for apps running v4 + v8:
    - Removes `Index.cshtml` for apps where it can be auto-generated
    - Rewrites legacy conditional rendering rule configuration to `hidden`-expressions
    - Rewrites legacy data processing rule handlers to `IDataWriteProcessor`
    - Removes `layout-sets.json` and renames layout-set folders to match task IDs
