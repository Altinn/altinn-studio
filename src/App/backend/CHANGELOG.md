# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Add `MaskinportenTokenRequest` overloads to `IMaskinportenClient.GetAccessToken`/`GetAltinnExchangedToken` and `UseMaskinportenAuthorization`/`UseMaskinportenAltinnAuthorization`, supporting the `consumer_org`, `resource` (RFC 8707) and system user `authorization_details` (RFC 9396) grant claims.

### Changed

- Breaking: add the `MaskinportenTokenRequest` overloads to the `IMaskinportenClient` interface. Apps with a custom implementation must implement them.
- Breaking: add `maskinporten.consumer_org`, `maskinporten.resource`, `maskinporten.systemuser_org` and `maskinporten.systemuser_external_ref` tags to the Maskinporten trace activities.
- Breaking: Maskinporten scopes are now de-duplicated and ordered before use, and a request without any usable scope throws `ArgumentException` instead of being sent to Maskinporten. `UseMaskinportenAuthorization`/`UseMaskinportenAltinnAuthorization` validate at registration time rather than on first request.
- Validate `MaskinportenTokenRequest.Resource` and `MaskinportenSystemUser.ExternalRef` against the rules Maskinporten enforces (no URI fragment; external references limited to 255 characters from `a-z A-Z 0-9 ø Ø æ Æ å Å _ -`), so these fail locally rather than as an opaque `invalid_target`/`MP_302` from the token endpoint.

### Removed

- Breaking: remove the obsolete `UseMaskinportenAuthorisation` and `UseMaskinportenAltinnAuthorisation` extension methods. Use the `-ization` spellings instead.

## [9.0.0-preview.2] - 2026-07-01

### Added

- Add workflow engine integration. Process transitions and service tasks now run as idempotent, retryable commands.
- Add process hook interfaces `IOnTaskStartingHandler`, `IOnTaskEndingHandler`, `IOnTaskAbandonHandler`, and `IOnProcessEndingHandler`.
- Add `GlobalPageSettings` model and `IAppResources.GetGlobalUiSettings()` for reading global UI settings in backend code.

### Changed

- Modify `IServiceTask` and `ServiceTaskResult` to support workflow engine integration.
- Update `Microsoft.OpenApi` to version 2.

### Fixed

- Fix PDF generation to respect global page settings.

### Removed

- Breaking: remove `IProcessTaskStart`, `IProcessTaskEnd`, and `IProcessTaskAbandon` in favor of the new `IOnTaskStartingHandler`, `IOnTaskEndingHandler`, and `IOnTaskAbandonHandler` hooks.

## [9.0.0-preview.1] - 2026-06-08

### Added

- Bundle the built app frontend in `Altinn.App.Api`.
- Add app package release tooling.
