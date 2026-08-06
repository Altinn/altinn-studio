# Changelog

All notable changes to Altinn app backend packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries should describe only user-facing functionality in clear, user-friendly language; omit implementation details that do not affect how people use the product.
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

## [Unreleased]

### Added

- Add durable yield for service tasks: `ServiceTaskResult.Defer(delay, reason)` parks the process on the task — no error recorded, worker released — and re-runs it after `delay`, bounded by `ProcessStepOptions.WaitBudget`. A deferral is stateless: nothing is saved, and a deferring attempt that modified instance data is rejected — work that records something durable belongs in its own pipeline stage (see pipeline service tasks below), completed rather than deferred. `ServiceTaskContext` groups the two engine clocks as `Attempt` (`RetryCount`, `Deadline`) and `Wait` (`DeferCount`, `StartedAt`, `Deadline`, and the derived `Remaining`/`IsFinalCheck`), and carries `StepId`, a stable per-step idempotency key for outbound calls a send-then-poll task must not repeat. The deferral's `reason` surfaces on engine status reads and as `workflow.waitingReason` on the app's process reads.
- Add pipeline service tasks — a service task can now compose several durable stages. Implement `IPipelineServiceTask` (the new root that `IServiceTask` derives from) and compose the pipeline in `Define`: `pipeline.Stage(name, work, options?)` per stage, ended by the one `Finally(work)` — the builder's types make any other shape uncompilable, and concluding the task (success, auto-advance, park, defer) is reserved for the `Finally`. Each stage runs as its own workflow-engine step — own retry budget, timeout/wait budget (per-stage options, field-wise over the task's own), and idempotency key (`context.StepId`) — and a completed stage never re-runs: a retry or resume re-enters the pipeline at the failed stage. Stages share state the way service tasks already do, through `context.InstanceDataMutator`: a completed stage's data changes are saved and visible to every stage after it. Stage names are explicit literals (printable ASCII — they travel in the engine's `Operation-Id` HTTP header) and are a compatibility surface for in-flight workflows — renaming a stage's method is refactor-safe, the literal is what must stay put. Stages return `ServiceTaskStageResult.Completed`/`Defer`/`FailedRetryable`/`FailedPermanent`. Pipelines are validated at app startup. A plain `IServiceTask` is unchanged for implementers (`Type` + `Execute`) and is now literally a pipeline whose only step is the conclusion: its sealed interface default forwards `Define` to `Finally(Execute)`. For send-then-poll, give the send its own stage and let `Finally` poll via `Defer`.
- Add analyzer rule `ALTINNAPP0700` (error): a class implementing `IServiceTask` must not replace the sealed forwarding default of `IPipelineServiceTask.Define` — its `Execute` would silently never run. Implement `IPipelineServiceTask` directly instead. App startup validates the same contract as a backstop.

### Changed

- Breaking: `PlatformHttpException.Response` is now a `PlatformHttpResponse` — an immutable snapshot of the failed response — instead of a live `HttpResponseMessage`. Reading `Response.StatusCode` is unaffected, and the new `exception.StatusCode` is a shorthand for it. `Response.Content` is now the response body as a string (already read, capped at 16 KB, with `ContentTruncated` telling you if it was cut off), and `Response.Headers` is a read-only dictionary with `Authorization`, `Proxy-Authorization`, `Cookie` and `Set-Cookie` values redacted. The snapshot stays readable for the lifetime of the exception; previously the underlying response was often already disposed by the time it was caught, so anything beyond the status code was unreliable. `CreateAsync` is renamed to `Create`, now takes ownership of the response and disposes it, and accepts an optional message, inner exception and cancellation token; the constructor takes a `PlatformHttpResponse`. `studioctl app upgrade v9` migrates the renamed factory and the constructor automatically, and reports uses it cannot rewrite.
- A failed request whose body is not text — a failed PDF or file download, say — no longer copies the whole payload into the exception message; it records a short descriptor such as `<application/pdf; 40213 bytes>` instead. Response bodies that are text are capped at 16 KB.
- Breaking: `ServiceTaskContext.WorkflowId` is now a required, non-nullable `Guid` (was `Guid?`). The context only ever originates from a workflow callback, where the id always exists; a test constructing one directly must supply it.
- The Maskinporten JWT-grant audience (the well-known issuer) is resolved once per configured `Authority` and cached for the process lifetime, warmed up at app startup and re-resolved every 12 hours by a background service. Previously it was cached for one hour and refreshed from the request path. Changing the `Authority` (settings are hot-reloadable) still triggers a fresh fetch.

### Fixed

- A well-known lookup failure no longer costs every token request a blocking 10 second fetch during an outage: failures fail fast to the `Authority` fallback for 30 seconds, and concurrent lookups share a single fetch.
- A request cancelled at the wrong moment could permanently disable the background refresh of the well-known metadata.
- A well-known response with a missing or empty `issuer` is now treated as a failed lookup instead of producing an invalid `aud` claim.

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
