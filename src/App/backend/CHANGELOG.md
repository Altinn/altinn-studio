# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Add durable yield for service tasks: `ServiceTaskResult.Defer(delay, reason)` parks the process on the task — no error recorded, worker released — and re-runs it after `delay`, bounded by `ProcessStepOptions.WaitBudget`. `ServiceTaskContext` groups the two engine clocks as `Attempt` (`RetryCount`, `Deadline`) and `Wait` (`DeferCount`, `StartedAt`, `Deadline`, and the derived `Remaining`/`IsFinalCheck`), and carries `StepId`, a stable per-step idempotency key for outbound calls a send-then-poll task must not repeat. The deferral's `reason` surfaces on engine status reads and as `workflow.waitingReason` on the app's process reads.
- Add service-task checkpoints — the durable send guard for send-then-poll tasks: `context.Checkpoints.Set(key, value)` writes an instance data value (keyed `serviceTask:{Type}:{key}`) to Storage immediately, outside the save-on-success unit of work, and `Checkpoints.Get(key)` reads through to Storage so a crashed attempt's evidence is visible to its retry. `ServiceTaskContext.Checkpoints` is a required `IServiceTaskCheckpoints` — the runtime supplies the Storage-backed implementation, and a unit test constructing a context injects a fake (an in-memory dictionary is enough), exactly as it already does for `InstanceDataMutator`.

- Support several custom recipients on a correspondence notification. `WithRecipientOverride` now accumulates and can be chained; `WithRecipientOverrides` adds several at once.
- Add `CorrespondenceRequest.IdempotentKey` and `WithIdempotentKey(Guid)`, so a request that may be retried cannot create the correspondence twice. Reuse the same key on retry; a duplicate fails with `CorrespondenceRequestException` carrying `409 Conflict`, which the caller can treat as "already sent". The key cannot be empty or combined with multiple recipients, both of which `CorrespondenceRequest.Validate` rejects up front.
- Add `CorrespondenceNotification.OverrideRegisteredContactInformation` to notify only the custom recipients instead of also notifying the recipient's registered contact information. Defaults to `false`.
- Add `MaskinportenTokenRequest` overloads to `IMaskinportenClient.GetAccessToken`/`GetAltinnExchangedToken` and `UseMaskinportenAuthorization`/`UseMaskinportenAltinnAuthorization`, supporting the `consumer_org`, `resource` (RFC 8707) and system user `authorization_details` (RFC 9396) grant claims.

### Changed

- Breaking: `ServiceTaskContext.WorkflowId` is now a required, non-nullable `Guid` (was `Guid?`). The context only ever originates from a workflow callback, where the id always exists; a test constructing one directly must supply it.
- Breaking: the eFormidling shipment-ownership claim moved onto the checkpoint API: the instance data value is now `serviceTask:eFormidling:shipmentWorkflowId` (was `eFormidlingShipmentWorkflowId`), and `EformidlingConstants.ShipmentOwnerWorkflowIdDataValueKey` is renamed `ShipmentOwnerCheckpointKey` (holding only the unprefixed key). A preview instance whose shipment was sent under the old key re-runs the send, which self-heals on the duplicate message id.
- Breaking: `CorrespondenceNotification.CustomRecipient` is now `CustomRecipients`, a list. Repeated `WithRecipientOverride` calls keep every recipient instead of only the last.
- Breaking: `WithResourceId` returns `ICorrespondenceRequestBuilderSendersReference`; the now-empty `ICorrespondenceRequestBuilderSender` step is gone.
- Breaking: `ICorrespondenceNotificationBuilder` gains three methods — additive for callers, breaking for external implementors.
- Breaking: `CorrespondencePayloadBase` no longer has an accessible parameterless constructor, and the payload types reject a null request or authentication method.
- Breaking: add the `MaskinportenTokenRequest` overloads to the `IMaskinportenClient` interface. Apps with a custom implementation must implement them.
- Breaking: add `maskinporten.consumer_org`, `maskinporten.resource`, `maskinporten.systemuser_org` and `maskinporten.systemuser_external_ref` tags to the Maskinporten trace activities.
- Breaking: Maskinporten scopes are now de-duplicated and ordered before use, and a request without any usable scope throws `ArgumentException` instead of being sent to Maskinporten. `UseMaskinportenAuthorization`/`UseMaskinportenAltinnAuthorization` validate at registration time rather than on first request.
- Validate `MaskinportenTokenRequest.Resource` and `MaskinportenSystemUser.ExternalRef` against the rules Maskinporten enforces (no URI fragment; external references limited to 255 characters from `a-z A-Z 0-9 ø Ø æ Æ å Å _ -`), so these fail locally rather than as an opaque `invalid_target`/`MP_302` from the token endpoint.

### Fixed

- Apply a 30 second timeout to the Maskinporten token request and the Altinn token exchange, which previously inherited the 100 second `HttpClient` default. A cancellation from the caller now surfaces as `OperationCanceledException` rather than being wrapped as an authentication failure.
- Mask the signature of the Maskinporten grant assertion in debug logs, matching how `JwtToken` renders itself.

### Removed

- Breaking: remove the legacy authorisation model — the `CorrespondenceAuthorisation` enum and the payload constructors taking it or a `Func<Task<JwtToken>>`. Use `CorrespondenceAuthenticationMethod.Default()` or `.Custom(factory)`. Note that `Default()` also requests `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write`, so Maskinporten clients need those scopes.
- Breaking: remove `Sender`, `AllowSystemDeleteAfter` and `RequestedSendTime` with their builder methods, plus the matching response properties. The Correspondence API no longer accepts them and the builder methods were already no-ops.
- Breaking: remove the legacy notification recipient override — `CorrespondenceNotificationRecipientWrapper`, `CustomNotificationRecipients`, `CorrespondenceNotificationRecipient.IsReserved`, `WithRecipientToOverride` and `WithCorrespondenceNotificationRecipients`. Use `CustomRecipients` and `IgnoreReservation`. The `customNotificationRecipients` payload field is no longer sent.
- Breaking: remove `ICorrespondenceAttachmentBuilder.WithData(ReadOnlyMemory<byte>)`. Wrap an in-memory payload yourself: `WithData(new MemoryStream(bytes))`. Its deprecation blamed the API for an inefficiency that was really an internal copy, and having two ways to set one field meant a stream silently won over bytes regardless of call order. `studioctl app upgrade v9` rewrites the call where it can determine the argument is a byte payload, and reports it otherwise.
- Breaking: remove `CorrespondenceAttachment.DataLocationType`, `WithDataLocationType` and the `CorrespondenceDataLocationType` enum. The attachment upload endpoint has no such field, so the value never reached a request.
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
