# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Changed

- Send correspondence notification recipient overrides as the Correspondence API's current `customRecipients` list instead of its deprecated singular `customRecipient`. No app-facing change — `CorrespondenceNotification.CustomRecipient` and `WithRecipientOverride` are unchanged, and the API normalised the singular form into this same one-element list anyway, so the resulting notification is identical. This gets the client off all three deprecated recipient-override tiers rather than moving it from the oldest to the middle one.
- Breaking: `ICorrespondenceRequestBuilderResourceId.WithResourceId` now returns `ICorrespondenceRequestBuilderSendersReference` instead of `ICorrespondenceRequestBuilderSender`, and the now-empty `ICorrespondenceRequestBuilderSender` step interface is gone. Fluent chains are unaffected; only code that names these types explicitly needs updating.
- Breaking: `CorrespondencePayloadBase` no longer exposes a parameterless `protected` constructor; its authentication method is now supplied by an internal constructor and is non-nullable. Construct payloads through `SendCorrespondencePayload` / `GetCorrespondenceStatusPayload`, which now throw `ArgumentNullException` instead of failing later when passed a null request or authentication method.

### Removed

- Breaking: remove the legacy correspondence authorisation model in favor of `CorrespondenceAuthenticationMethod`: the `CorrespondenceAuthorisation` enum, and the `SendCorrespondencePayload`/`GetCorrespondenceStatusPayload` constructor overloads taking `CorrespondenceAuthorisation` or `Func<Task<JwtToken>>`. Replace `new SendCorrespondencePayload(request, CorrespondenceAuthorisation.Maskinporten)` with `new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default())`, and a token-factory overload with `CorrespondenceAuthenticationMethod.Custom(factory)`. **Note the scope change:** the legacy Maskinporten path requested `altinn:serviceowner` + `altinn:correspondence.write`, whereas `CorrespondenceAuthenticationMethod.Default()` additionally requests `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write`. Service owners must have these scopes available to their Maskinporten client.
- Breaking: remove correspondence fields that the Correspondence API no longer accepts, and which the client already silently discarded: `CorrespondenceRequest.Sender` (the sender is derived from the Resource Registry via `resourceId`), `CorrespondenceRequest.AllowSystemDeleteAfter`, `CorrespondenceNotification.RequestedSendTime`, the builder methods `WithSender` (both overloads), `WithAllowSystemDeleteAfter` and `WithRequestedSendTime`, plus the response properties `GetCorrespondenceStatusResponse.AllowSystemDeleteAfter` and `CorrespondenceNotificationOrderResponse.RequestedSendTime`. All removed builder methods were already no-ops, so removing them changes no request payload — just delete the calls.
- Breaking: remove the legacy notification recipient-override surface in favor of the singular `CorrespondenceNotification.CustomRecipient` / `WithRecipientOverride(CorrespondenceNotificationRecipient)`: the `CorrespondenceNotificationRecipientWrapper` model, `CorrespondenceNotification.CustomNotificationRecipients`, `CorrespondenceNotificationRecipient.IsReserved`, `WithRecipientOverride(CorrespondenceNotificationRecipientWrapper)`, `ICorrespondenceNotificationOverrideBuilder.WithRecipientToOverride` (all four overloads) and `WithCorrespondenceNotificationRecipients`. `ICorrespondenceNotificationOverrideBuilder` itself and the other `WithRecipientOverride` overloads are unchanged — use `WithOrganizationNumber`/`WithNationalIdentityNumber`/`WithEmailAddress`/`WithMobileNumber`. This is the one removal that changes the request payload: `customNotificationRecipients` is no longer sent. The API honoured only the first entry of that list, and the builder path already dropped it silently. Use `IgnoreReservation` on the correspondence instead of `IsReserved`, which the client never sent.
- Breaking: remove the attachment data-location surface, which had no effect on any request: `CorrespondenceAttachment.DataLocationType`, `ICorrespondenceAttachmentBuilder.WithDataLocationType` and the `CorrespondenceDataLocationType` enum. The current attachment flow uploads via `POST /correspondence/attachment`, which has no `dataLocationType` field, so the value was never serialised. The enum also carried a misspelled `ExisitingExternalStorage` member that the API renamed and would now reject.

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
