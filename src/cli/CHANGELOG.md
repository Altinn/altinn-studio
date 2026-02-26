# Changelog

All notable changes to studioctl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Bump NuGet dependencies: Jint 4.6.0, Microsoft.Build.Locator 1.11.2, MinVer 6.1.0, CSharpier.MsBuild 1.2.6, SonarAnalyzer.CSharp 10.19.0.132793, Microsoft.Build.Framework 18.3.3, Microsoft.Build.Tasks.Core 18.3.3, Microsoft.Build.Utilities.Core 18.3.3 (#17103)

### Fixed

- PDF connectivity when running `env localtest` (#17959)
- Handle partial "up" state in `env up` (#17959)

## [0.1.0-preview.1] - 2026-02-25

### Added

- Initial implementation of studioctl CLI tool (#17841)
