# Architectural Changes: Generic Tenant Model & Command Handler Plugin System

## The Problem

The workflow engine had Altinn's domain concepts wired into every layer. The `Workflow` model carried `Actor`, `InstanceInformation` (Org, App, InstanceOwnerPartyId, InstanceGuid), and `InstanceLockKey` as required first-class fields. The database stored these as individual columns (`ActorUserIdOrOrgNumber`, `ActorLanguage`, `InstanceOrg`, `InstanceApp`, `InstanceOwnerPartyId`, `InstanceGuid`). The API routes were structured around the Altinn instance path (`/api/v1/workflows/{org}/{app}/{instanceOwnerPartyId}/{instanceGuid}`). The `WorkflowExecutor` contained all command execution logic inline, pattern-matching on a polymorphic `Command` hierarchy (`Command.AppCommand`, `Command.Webhook`, `Command.Debug.Noop`, etc.) and directly handling HTTP calls, payload construction, and response parsing.

This coupling meant the engine could only serve Altinn's specific use case, and any new command type required modifying the executor's switch expression and the `Command` type hierarchy.

## 1. Generic Tenant Model

The Altinn-specific fields on `Workflow`, `Step`, and their database entities have been replaced with three generic fields:

- **`TenantId`** (string) — an opaque identifier (e.g. `"ttd:my-app"`) that scopes isolation and idempotency. Replaces the combination of `InstanceOrg`, `InstanceApp`, `InstanceOwnerPartyId`, and `InstanceGuid`.
- **`Labels`** (`Dictionary<string, string>`, stored as JSONB) — queryable metadata. Callers can put whatever key-value pairs make sense for their domain (org, app, environment, etc.).
- **`Context`** (`JsonElement`) — an opaque blob passed through to command handlers at execution time. This is where domain-specific data like actors, lock tokens, and instance info now lives — the engine never inspects it.

The API routes changed accordingly: `/api/v1/tenants/{tenantId}/workflows` instead of the old instance-path structure.

A database migration drops the old columns, adds the new ones, and creates appropriate indexes — including a GIN index on `LabelsJson` for efficient JSONB containment queries, and a composite index on `(TenantId, Status)` for the primary lookup pattern.

The `Command` model was also simplified. The old polymorphic record hierarchy (`Command.AppCommand`, `Command.Webhook`, `Command.Debug.*`) with `[JsonPolymorphic]`/`[JsonDerivedType]` attributes was replaced by a flat `Command` class with a `Type` string discriminator and a `Data` `JsonElement`. The engine no longer knows or cares what's inside a command — it just routes it to the right handler by type.

## 2. Command Handler Plugin System

The `WorkflowExecutor` previously contained all command execution logic — HTTP client setup, payload serialization, response parsing, activity tracing, and concurrency limiting — in one large class with a pattern-match switch. This has been decomposed into a plugin system:

- **`ICommandHandler`** — a new interface in `WorkflowEngine.Models` with `ExecuteAsync()`, `Validate()`, and a `CommandType` string property.
- **`CommandHandlerRegistry`** — a simple dictionary-based registry that maps command type strings to handler instances, built at DI startup.
- **`WorkflowExecutor`** — now a thin dispatcher. It looks up the handler from the registry and delegates execution. The executor no longer references any HTTP, JSON, or Altinn-specific types.

The `AppCommandHandler` and `WebhookCommandHandler` live in a new **`WorkflowEngine.CommandHandlers`** project (class library), along with all the Altinn-specific models they need (`Actor`, `AppCallbackPayload`, `AppCallbackResponse`, `AppCommandSettings`, `InstanceInformation`). These types were removed from `WorkflowEngine.Models` — the engine core no longer references them.

Handler registration is config-driven: a `"CommandHandlers"` config section (defaulting to `["app", "webhook"]`) controls which handlers are active. At enqueue time, the engine validates that every command in a request has a registered handler, rejecting unknown types with `400 Bad Request` before anything reaches the database.

## 3. Enqueue-Time Validation

Each handler implements `Validate(JsonElement? commandData, JsonElement? workflowContext)`, called during request validation before persistence. For example, `AppCommandHandler.Validate()` checks that the opaque `Context` blob contains the fields it needs (actor with a user ID, org, app, party ID > 0, non-empty instance GUID, lock token). Invalid requests are rejected upfront instead of being accepted and failing at execution time.

A dedicated `CommandHandlerNotFoundException` replaced brittle `e.Message.Contains("No handler registered")` string matching in the executor's error handling.

## 4. Cleanup and Hardening

- **Debug commands removed**: The `Command.Debug.Noop`, `Command.Debug.Throw`, `Command.Debug.Timeout`, and `Command.Debug.Delegate` types and their execution logic were removed from production code. Test-specific equivalents remain in the test fixture.
- **Error classification**: Both handlers now distinguish between retryable errors (5xx, 408, 429) and critical/non-retryable errors (other 4xx). Missing lock tokens return `CriticalError` instead of throwing exceptions that were incorrectly caught as retryable.
- **`ExecutionResult.Canceled()`**: Now explicitly handled in the retry logic as a terminal state (same as critical error), closing a gap where it would have fallen through to retry.
- **Tenant isolation audit**: `GetFinishedWorkflows` gained a `tenantFilter` parameter to prevent cross-tenant data leakage in query results. The cross-tenant `GetWorkflow(idempotencyKey, ...)` overload used by the dashboard is documented as such and gated behind non-production environment checks.
- **JSON handling**: All serializable types carry explicit `[JsonPropertyName]` attributes for predictable serialization output, while deserialization uses `PropertyNameCaseInsensitive = true` to accept any casing from callers.
