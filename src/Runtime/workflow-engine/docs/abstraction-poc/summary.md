# Workflow Engine — Branch Merge Summary

**Target branch**: `feature/workflow-engine-abstraction-poc` (this branch)
**Source branch**: `feature/workflow-engine` (parent)
**Divergence point**: commit `148ad349dd` ("Fixes incorrect k6 payload")

## What This Branch Changed (relative to parent at divergence)

### 1. Core/App Split (Generic Tenant Model)

Separated the monolithic `WorkflowEngine.Api` (ASP.NET web project) into:

- **`WorkflowEngine.Core`** — a class library containing the engine logic (processing loop, executor, registry, write buffers, endpoints, telemetry). Uses `Microsoft.NET.Sdk` with a `FrameworkReference` to `Microsoft.AspNetCore.App` and a `GlobalUsings.cs` file to compensate for the loss of implicit ASP.NET usings.
- **`WorkflowEngine.App`** (in `workflow-engine-app/`) — a thin web host that composes Core + Commands. Contains only `Program.cs` and an `appsettings.json`.

**Why**: The engine should be reusable across different Altinn runtimes. Command implementations (like `AppCommand`) are Altinn-specific, but the engine itself is not. This split lets different hosts bring their own commands.

**Key details**:
- `WorkflowEngine.Core` namespace is used throughout (renamed from `WorkflowEngine.Api`)
- Route simplified to `/api/v1/workflows` — no tenant/org/app path segments
- `WorkflowEngine.App.slnx` is a separate solution file for the app host
- Docker Compose, k6 tests, and CI workflows updated accordingly

### 2. Command Descriptor Pattern (replacing ICommandHandler)

Replaced the handler-centric `ICommandHandler` interface with a descriptor-centric `ICommand` interface:

**Old pattern** (`ICommandHandler`):
- String `CommandType` property
- `Validate(JsonElement? commandData, JsonElement? workflowContext)` — raw JSON
- `ExecuteAsync(CommandExecutionContext context, CancellationToken ct)` — raw JSON in context
- Each handler independently deserializes and validates JSON

**New pattern** (`ICommand`):
- String `CommandType` property
- `Type? CommandDataType` / `Type? WorkflowContextType` — declares expected CLR types (null = not needed)
- `Validate(object? commandData, object? workflowContext)` — pre-deserialized typed objects
- `ExecuteAsync(CommandExecutionContext context, CancellationToken ct)` — typed data in context

**Generic base classes**:
- `Command<TData, TContext>` — for commands needing both data and workflow context
- `Command<TData>` — for commands needing only command data (no workflow context)

**Centralized deserialization**:
- `Engine.ValidateCommands()` — deserializes at enqueue time for validation, rejects with clean error on failure
- `WorkflowExecutor.Execute()` — deserializes at execution time, populates `CommandExecutionContext.TypedCommandData` and `TypedWorkflowContext`
- Both use `CommandSerializerOptions.Default` (shared `JsonSerializerOptions` instance)

**`CommandExecutionContext` changes**:
- Added `TypedCommandData` (object?), `TypedWorkflowContext` (object?), `RawCommandData` (JsonElement?)
- Added `GetCommandData<T>()` / `GetWorkflowContext<T>()` — cast accessors that throw `CommandDataTypeMismatchException`

**Registration**:
- `AddCommandHandler<T>()` → `AddCommand<T>()`
- Descriptors registered as `ICommand` singletons via DI
- `CommandRegistry` builds `Dictionary<string, ICommand>` from all registered descriptors at startup
- Duplicate `CommandType` strings cause a startup exception (fail-fast)

---

## What the Parent Branch Changed (since divergence — 7 commits)

### 1. Backoff Moved from Step to Workflow
- `BackoffUntil` removed from `Step`/`StepEntity`, added to `Workflow`/`WorkflowEntity`
- Queue index changed from `(StartAt, CreatedAt)` to `(BackoffUntil, CreatedAt)`
- `WorkflowHandler` updated: retry backoff assigned at workflow level

### 2. Bulk Insert Infrastructure
- New `SqlBulkInserter` using PostgreSQL COPY binary protocol (replaces EF Core `SaveChanges` for batch enqueue)
- New `TupleArrayExtensions` helper for unzipping tuple arrays
- Idempotency key simplified from `(Key, Org, App, PartyId, Guid)` to `(Key, Namespace)`

### 3. Namespace Support
- `Namespace` field added to `Workflow` (required, defaults `"default"`)
- DB index `(Namespace, Status)` added
- Query param `?namespace=` filtering on GET endpoints
- Idempotency scoped per namespace

### 4. Correlation ID
- `CorrelationId` (nullable `Guid?`) added to `Workflow`
- Replaces instance-based route params for workflow lookup
- API route changed from `/api/v1/workflows/{org}/{app}/{partyId}/{guid}` to `/api/v1/workflows`
- `InstanceRouteParams` struct removed entirely
- Instance info (`Org`, `App`, etc.) moved into request body

### 5. Migrations Removed
- All migration files deleted in final commit — same strategy as our branch
- Both branches are prepped for a single unified Initial migration post-merge

---

## Convergence and Divergence

| Concept | Our Branch | Parent Branch | Resolution |
|---------|-----------|---------------|------------|
| **Namespace** | Required field, `(IdempotencyKey, Namespace)` composite key, query param filter | Same design, defaults to `"default"` | Converged — take parent's implementation (equivalent) |
| **API routes** | `/api/v1/workflows` (flat, no path segments) | `/api/v1/workflows` (flat, same) | Converged — both arrived at the same route structure |
| **Correlation ID** | Not present | `Guid? CorrelationId` on Workflow | Adopt from parent |
| **BackoffUntil** | On Step (unchanged from divergence point) | Moved to Workflow | Adopt from parent |
| **Bulk insert** | Not present | `SqlBulkInserter` + `TupleArrayExtensions` | Adopt from parent |
| **Command pattern** | `ICommand` / `Command<T>` / `CommandRegistry` | Still `ICommandHandler` / `CommandHandlerRegistry` | Keep ours |
| **Core/App split** | `WorkflowEngine.Core` (class lib) + `WorkflowEngine.App` (host) | Monolithic `WorkflowEngine.Api` | Keep ours |
| **Typed deserialization** | Centralized in Engine + WorkflowExecutor | Not present (handlers do their own) | Keep ours |
| **Labels** | Present on `WorkflowEnqueueRequest` | Present on `WorkflowEnqueueRequest` | Converged |
| **Context** | `JsonElement? Context` on request and workflow | `JsonElement? Context` on request | Converged |
