# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Support several custom recipients on a correspondence notification. `WithRecipientOverride` now accumulates and can be chained; `WithRecipientOverrides` adds several at once.
- Add `CorrespondenceRequest.IdempotentKey` and `WithIdempotentKey(Guid)`, so a send that may be retried cannot create the correspondence twice. Reuse the same key on retry; a duplicate fails with `CorrespondenceRequestException` carrying `409 Conflict`, which the caller can treat as "already sent". The key cannot be empty or combined with multiple recipients, both of which `CorrespondenceRequest.Validate` rejects up front.
- Add `CorrespondenceNotification.OverrideRegisteredContactInformation` to notify only the custom recipients instead of also notifying the recipient's registered contact information. Defaults to `false`.

### Changed

- Breaking: `CorrespondenceNotification.CustomRecipient` is now `CustomRecipients`, a list. Repeated `WithRecipientOverride` calls keep every recipient instead of only the last.
- Breaking: `WithResourceId` returns `ICorrespondenceRequestBuilderSendersReference`; the now-empty `ICorrespondenceRequestBuilderSender` step is gone.
- Breaking: `ICorrespondenceNotificationBuilder` gains three methods — additive for callers, breaking for external implementors.
- Breaking: `CorrespondencePayloadBase` no longer has an accessible parameterless constructor, and the payload types reject a null request or authentication method.

### Removed

- Breaking: remove the legacy authorisation model — the `CorrespondenceAuthorisation` enum and the payload constructors taking it or a `Func<Task<JwtToken>>`. Use `CorrespondenceAuthenticationMethod.Default()` or `.Custom(factory)`. Note that `Default()` also requests `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write`, so Maskinporten clients need those scopes.
- Breaking: remove `Sender`, `AllowSystemDeleteAfter` and `RequestedSendTime` with their builder methods, plus the matching response properties. The Correspondence API no longer accepts them and the builder methods were already no-ops.
- Breaking: remove the legacy notification recipient override — `CorrespondenceNotificationRecipientWrapper`, `CustomNotificationRecipients`, `CorrespondenceNotificationRecipient.IsReserved`, `WithRecipientToOverride` and `WithCorrespondenceNotificationRecipients`. Use `CustomRecipients` and `IgnoreReservation`. The `customNotificationRecipients` payload field is no longer sent.
- Breaking: remove `ICorrespondenceAttachmentBuilder.WithData(ReadOnlyMemory<byte>)`. Wrap an in-memory payload yourself: `WithData(new MemoryStream(bytes))`. Its deprecation blamed the API for an inefficiency that was really an internal copy, and having two ways to set one field meant a stream silently won over bytes regardless of call order. `studioctl app upgrade v9` rewrites the call where it can determine the argument is a byte payload, and reports it otherwise.
- Breaking: remove `CorrespondenceAttachment.DataLocationType`, `WithDataLocationType` and the `CorrespondenceDataLocationType` enum. The attachment upload endpoint has no such field, so the value never reached a request.

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
