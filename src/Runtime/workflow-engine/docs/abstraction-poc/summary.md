# Workflow Engine Abstraction POC — Branch Summary

**Branch**: `feature/workflow-engine-abstraction-poc`
**Parent**: `feature/workflow-engine`
**Divergence point**: commit `5a1eecf68b` ("Updates telemetry tests")

## Two Fundamental Changes

### 1. Core/App Split (Generic Tenant Model)

Separated the monolithic `WorkflowEngine.Api` (ASP.NET web project) into:

- **`WorkflowEngine.Core`** — a class library containing the engine logic (processing loop, executor, registry, write buffers, endpoints, telemetry). Uses `Microsoft.NET.Sdk` with a `FrameworkReference` to `Microsoft.AspNetCore.App` and a `GlobalUsings.cs` file to compensate for the loss of implicit ASP.NET usings.
- **`WorkflowEngine.App`** (in `workflow-engine-app/`) — a thin web host that composes Core + CommandHandlers. Contains only `Program.cs` and an `appsettings.json`.

**Why**: The engine should be reusable across different Altinn runtimes. Command handlers (like `AppCommandDescriptor`) are Altinn-specific, but the engine itself is not. This split lets different hosts bring their own command descriptors.

**Key details**:
- `WorkflowEngine.Api` namespace was preserved throughout Core (no mass rename)
- Route changed from `/api/v1/workflows/{tenantId}/{org}/{app}/...` to `/api/v1/workflows/{org}/{app}/...` — tenantId now comes from a header/config
- `WorkflowEngine.App.slnx` is a separate solution file for the app host
- Docker Compose, k6 tests, and CI workflows were updated accordingly

### 2. Command Descriptor Pattern (replacing ICommandHandler)

Replaced the handler-centric `ICommandHandler` interface with a descriptor-centric `ICommandDescriptor` interface:

**Old pattern** (`ICommandHandler`):
- String `CommandType` property
- `Validate(JsonElement? commandData, JsonElement? workflowContext)` — raw JSON
- `ExecuteAsync(CommandExecutionContext context, CancellationToken ct)` — raw JSON in context
- Each handler independently deserializes and validates JSON

**New pattern** (`ICommandDescriptor`):
- String `CommandType` property
- `Type? CommandDataType` / `Type? WorkflowContextType` — declares expected CLR types (null = not needed)
- `Validate(object? commandData, object? workflowContext)` — pre-deserialized typed objects
- `ExecuteAsync(CommandExecutionContext context, CancellationToken ct)` — typed data in context

**Generic base classes**:
- `CommandDescriptor<TData, TContext>` — for commands needing both data and workflow context
- `CommandDescriptor<TData>` — for commands needing only command data (no workflow context)

**Centralized deserialization**:
- `Engine.ValidateCommands()` — deserializes at enqueue time for validation, rejects with clean error on failure
- `WorkflowExecutor.Execute()` — deserializes at execution time, populates `CommandExecutionContext.TypedCommandData` and `TypedWorkflowContext`
- Both use `CommandSerializerOptions.Default` (shared `JsonSerializerOptions` instance)

**`CommandExecutionContext` changes**:
- Added `TypedCommandData` (object?), `TypedWorkflowContext` (object?), `RawCommandData` (JsonElement?)
- Added `GetCommandData<T>()` / `GetWorkflowContext<T>()` — cast accessors that throw `CommandDataTypeMismatchException`

**Registration**:
- `AddCommandHandler<T>()` → `AddCommand<T>()`
- Descriptors registered as `ICommandDescriptor` singletons via DI
- `CommandRegistry` builds `Dictionary<string, ICommandDescriptor>` from all registered descriptors at startup
- Duplicate `CommandType` strings cause a startup exception (fail-fast)

## Files Changed (from parent branch)

### New files
| File | Purpose |
|------|---------|
| `src/WorkflowEngine.Models/ICommandDescriptor.cs` | Core descriptor interface |
| `src/WorkflowEngine.Models/CommandDescriptor.cs` | Two generic base classes |
| `src/WorkflowEngine.Models/CommandSerializerOptions.cs` | Shared JSON serializer options |
| `src/WorkflowEngine.Models/Exceptions/CommandDataTypeMismatchException.cs` | Type mismatch exception |
| `src/WorkflowEngine.Core/GlobalUsings.cs` | ASP.NET usings for class library |
| `workflow-engine-app/` (entire directory) | Thin web host |

### Deleted files
| File | Reason |
|------|--------|
| `src/WorkflowEngine.Models/ICommandHandler.cs` | Replaced by ICommandDescriptor |

### Renamed/rewritten files
| Old → New | Change |
|-----------|--------|
| `CommandHandlerRegistry.cs` → `CommandRegistry.cs` | Full rewrite for descriptor pattern |
| `AppCommandHandler.cs` → `AppCommandDescriptor.cs` | Extends `CommandDescriptor<AppCommandData, AppWorkflowContext>` |
| `WebhookCommandHandler.cs` → `WebhookCommandDescriptor.cs` | Extends `CommandDescriptor<WebhookCommandData>` |

### Significantly modified files
| File | Change |
|------|--------|
| `Engine.cs` | `ValidateCommands()` rewritten for typed deserialization |
| `WorkflowExecutor.cs` | Centralized deserialization before dispatch |
| `ServiceCollectionExtensions.cs` | `AddCommand<T>()` replaces `AddCommandHandler<T>()` |
| `CommandExecutionContext.cs` | Added typed properties + cast accessors |
| `AppCommandData.cs`, `WebhookCommandData.cs` | Changed from `internal` to `public` |
| Test fixtures and test files | Updated to descriptor pattern |

## Commit History (on this branch)

1. `148ad349dd` — Fixes incorrect k6 payload
2. `dc73991290` — Mega commit: domain layering and abstractions (Core/App split + descriptor pattern)
3. `6ce20dce72` — Tweaks handler structure and logic (red team fixes, bug fixes)
