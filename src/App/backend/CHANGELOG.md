# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries should describe only user-facing functionality in clear, user-friendly language; omit implementation details that do not affect how people use the product.
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Add durable yield for service tasks: `ServiceTaskResult.Defer(delay, reason)` parks the process on the task — no error recorded, worker released — and re-runs it after `delay`, bounded by `ProcessStepOptions.WaitBudget`. A deferral is stateless: nothing is saved, and a deferring attempt that modified instance data is rejected — work that records something durable belongs in its own pipeline stage (see pipeline service tasks below), completed rather than deferred. `ServiceTaskContext` groups the two engine clocks as `Attempt` (`RetryCount`, `Deadline`) and `Wait` (`DeferCount`, `StartedAt`, `Deadline`, and the derived `Remaining`/`IsFinalCheck`), and carries `StepId`, a stable per-step idempotency key for outbound calls a send-then-poll task must not repeat. The deferral's `reason` surfaces on engine status reads and as `workflow.waitingReason` on the app's process reads.
- Add pipeline service tasks — a service task can now compose several durable stages. Implement `IPipelineServiceTask` (the new root that `IServiceTask` derives from) and compose the pipeline in `Define`: `pipeline.Stage(name, work, options?)` per stage, ended by the one `Finally(work, options?)` — the builder's types make any other shape uncompilable, and concluding the task (success, auto-advance, park, defer) is reserved for the `Finally`. Each stage runs as its own workflow-engine step — own retry budget, timeout/wait budget (per-step options from `Stage`/`Finally`, field-wise over the task's own), and idempotency key (`context.StepId`) — and a completed stage never re-runs: a retry or resume re-enters the pipeline at the failed stage. Stages share state the way service tasks already do, through `context.InstanceDataMutator`: a completed stage's data changes are saved and visible to every stage after it. Stage names are explicit literals (printable ASCII — they travel in the engine's `Operation-Id` HTTP header) and are a compatibility surface for in-flight workflows — renaming a stage's method is refactor-safe, the literal is what must stay put. Stages return `ServiceTaskStageResult.Completed`/`Defer`/`FailedRetryable`/`FailedPermanent`. Pipelines are validated at app startup. A plain `IServiceTask` is unchanged for implementers (`Type` + `Execute`) and is now literally a pipeline whose only step is the conclusion: its sealed interface default forwards `Define` to `Finally(Execute)`. For send-then-poll, give the send its own stage and let `Finally` poll via `Defer`, declaring the wait budget on `Finally` so it applies to the poll alone — options set on the task itself are inherited by every stage as well.
- Add analyzer rule `ALTINNAPP0700` (error): a class implementing `IServiceTask` must not replace the sealed forwarding default of `IPipelineServiceTask.Define` — its `Execute` would silently never run. Implement `IPipelineServiceTask` directly instead. App startup validates the same contract as a backstop.
- Add `ServiceTaskContext.ExecutionReferenceTime`, the instant the workflow engine scheduled this step. Unlike `DateTimeOffset.Now` it is stable across retries, so a service task that stamps dates on what it produces can make a retry repeat the first attempt's values rather than mint new ones.
- eFormidling configuration is now checked when the app starts, instead of when an instance first reaches the task. An app whose BPMN has an eFormidling task fails to start if the task has no configuration block, if a required setting is missing for the environment being started, if it ships a data type that is not declared in `applicationmetadata.json`, or if eFormidling is enabled here but `AddEFormidlingServices2` was never called. Every problem is reported at once. A task disabled for this environment does not require the services to be registered, so an app that runs eFormidling only in production still starts locally.
- An eFormidling service task now waits for delivery confirmation before the process moves on. It sends the shipment, then checks the integrasjonspunkt's status — backing off from 15 seconds to 15 minutes between checks — and advances the process once the shipment is confirmed delivered. A shipment the integrasjonspunkt rejects, or that it declares expired, fails the task with a message naming what happened, so it reaches your monitoring instead of a queue handled by hand. Note what that means in practice: shipments carry a two-hour lifetime (set from `expectedResponseDateTime` in the shipment's own envelope, a long-standing value), and the integrasjonspunkt marks one that is not delivered within it as expired. The task waits slightly longer than that, so an expired shipment fails with the integrasjonspunkt's own verdict rather than a generic timeout. The last status reported for a shipment is recorded on the instance as the `eFormidlingShipmentStatus` data value, so what became of a delivery stays visible after the process has moved on. While the task is waiting, the process reads report it as waiting with the shipment's current status as the reason.

### Changed

- Breaking: an eFormidling service task no longer advances the process when the shipment is handed to the integrasjonspunkt — it advances when delivery is confirmed. **If your process has a feedback step after the eFormidling task, remove it.** That step existed to hold the instance while delivery was pending, and the Altinn Events reminder loop that used to move the process past it is gone — nothing will advance it, so instances would wait there indefinitely. `studioctl app upgrade v9` reports feedback tasks sitting behind a service task.
- Breaking: `IEFormidlingService` has a new method, `GetEFormidlingShipmentStatus`, which a custom implementation must add — implement it to decide what your app treats as delivered. Report `EFormidlingDeliveryState.Pending` while the shipment is still on its way (never throw for "no outcome yet", or the wait turns into a retry loop), `Delivered` once it has arrived, and `Failed` only when it can never arrive. Both methods also take a `CancellationToken`, cancelled when the workflow engine cuts the attempt off at its execution deadline — the built-in implementation observes it between the calls a shipment is made of, notably per attachment, since the eFormidling client itself accepts no token. `DefaultEFormidlingService`'s constructor no longer takes an `IEventsClient`.

- Breaking: `ServiceTaskContext.WorkflowId` is now a required, non-nullable `Guid` (was `Guid?`). The context only ever originates from a workflow callback, where the id always exists; a test constructing one directly must supply it.
- Breaking: the eFormidling extension points receive an `IInstanceDataAccessor` instead of an `Instance` — `IEFormidlingMetadata.GenerateEFormidlingMetadata`, `IEFormidlingReceivers.GetEFormidlingReceivers` and `IEFormidlingService.SendEFormidlingShipment`. Read instance data through the accessor (`dataAccessor.Instance` still gives you the instance itself). Metadata, receivers and the shipment now see the data the process transition already has in hand rather than a separate read from Storage, so a shipment can no longer be built from data that changed underneath it. `studioctl app upgrade v9` rewrites the signatures and the usages it can resolve, and reports the rest.
- Breaking: the Fiks Arkiv extension points changed, and there is no automated upgrade — update the implementations by hand. `IFiksArkivPayloadGenerator.GeneratePayload` takes the execution reference time and an `IInstanceDataAccessor` in place of the instance, and gains `ValidateConfiguration`, which an app-supplied generator must implement — move any configuration checks you ran elsewhere into it. `IFiksArkivHost.GenerateAndSendMessage` takes the message type, a sender reference identifying retries of the same message, the execution reference time and the active `IInstanceDataMutator`. `IFiksArkivConfigResolver.GetArchiveDocumentMetadata` and `GetRecipient` take the accessor.
- Every built-in Fiks Arkiv archive date is now derived from one conversion of the execution reference time, so a retried send repeats the dates of the first attempt instead of stamping the retry's own clock, and dates that should agree cannot land either side of midnight.
- The Maskinporten JWT-grant audience (the well-known issuer) is resolved once per configured `Authority` and cached for the process lifetime, warmed up at app startup and re-resolved every 12 hours by a background service. Previously it was cached for one hour and refreshed from the request path. Changing the `Authority` (settings are hot-reloadable) still triggers a fresh fetch.

### Fixed

- A well-known lookup failure no longer costs every token request a blocking 10 second fetch during an outage: failures fail fast to the `Authority` fallback for 30 seconds, and concurrent lookups share a single fetch.
- A request cancelled at the wrong moment could permanently disable the background refresh of the well-known metadata.
- A well-known response with a missing or empty `issuer` is now treated as a failed lookup instead of producing an invalid `aud` claim.
- An eFormidling delivery confirmation no longer moves the process a second time. The task advanced as soon as the shipment was handed over, and the reminder loop then moved the process again when delivery was confirmed — against whatever task the instance had reached by then.

### Removed

- Breaking: `DefaultEFormidlingService` is no longer public. It was never something to derive from or wrap — its methods were not virtual — and replacing the default has always meant registering your own `IEFormidlingService`, which is unchanged. This also stops two internal abstractions (`IUserTokenProvider`, `IAppMetadata`) from appearing in the public API through its constructor.
- Breaking: the eFormidling delivery reminder built on Altinn Events is gone — `EformidlingStartup` (which subscribed the app to reminder events it published to itself), `EformidlingConstants.CheckInstanceStatusEventType`, and the webhook handler behind them. The service task now does the waiting itself, so the cadence is the app's own rather than another service's retry policy, and it works locally, where events are never delivered. An app that registered `IEventsSubscription` solely for this can drop it. Publishing app events for third-party subscribers (`IEventsClient`) is unchanged.

## [9.0.0-preview.3] - 2026-07-29

### Added

- Support several custom recipients on a correspondence notification. `WithRecipientOverride` now accumulates and can be chained; `WithRecipientOverrides` adds several at once.
- Add `CorrespondenceRequest.IdempotentKey` and `WithIdempotentKey(Guid)`, so a request that may be retried cannot create the correspondence twice. Reuse the same key on retry; a duplicate fails with `CorrespondenceRequestException` carrying `409 Conflict`, which the caller can treat as "already sent". The key cannot be empty or combined with multiple recipients, both of which `CorrespondenceRequest.Validate` rejects up front.
- Add `CorrespondenceNotification.OverrideRegisteredContactInformation` to notify only the custom recipients instead of also notifying the recipient's registered contact information. Defaults to `false`.
- Add `MaskinportenTokenRequest` overloads to `IMaskinportenClient.GetAccessToken`/`GetAltinnExchangedToken` and `UseMaskinportenAuthorization`/`UseMaskinportenAltinnAuthorization`, supporting the `consumer_org`, `resource` (RFC 8707) and system user `authorization_details` (RFC 9396) grant claims.

### Changed

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
