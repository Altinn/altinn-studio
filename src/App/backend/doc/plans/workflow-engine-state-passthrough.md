# Plan: Generic State Passthrough for Workflow Engine

## Implementation Guidelines (for AI agents)

Before implementing, read and follow these rules:

### 1. Read Before Writing
- **Always read existing files** before modifying them - don't assume structure
- Look at similar existing code for patterns (e.g., how `AppCallbackPayload` is built in `WorkflowExecutor`, how `Workflow` is persisted)

### 2. Follow Existing Patterns
- Match the codebase's naming conventions, formatting, and style
- Use the same JSON serialization approach as other models (e.g., `[JsonPropertyName]`)
- Follow the existing entity mapping patterns in `WorkflowEntity`/`StepEntity`

### 3. Implement Incrementally
- Complete one phase fully before starting the next
- Build after each phase to catch errors early

### 4. Keep It Minimal
- Implement exactly what the plan specifies - no extras
- Don't refactor surrounding code

## Context

The workflow engine orchestrates multi-step workflows by calling back to an application for each step. Currently, the engine sends a callback payload and only checks the HTTP status code of the response. The app needs to maintain state across steps (e.g., in-memory copies of data that would otherwise require redundant fetches from external storage).

This plan adds a **generic, opaque state passthrough**: the app sends a `JsonElement` blob with the initial request, the engine stores it and echoes it with each callback. After each successful callback, the engine reads the response body for an updated state and stores it for the next step. The engine **never inspects or interprets** the state content.

## Codebase Location

The workflow engine is at: `C:\dev\digdir\altinn-studio\src\Runtime\workflow-engine`

Key files:
- `src/WorkflowEngine.Models/ProcessNextRequest.cs` - Inbound request model
- `src/WorkflowEngine.Models/AppCallbackPayload.cs` - Outbound callback payload
- `src/WorkflowEngine.Models/Workflow.cs` - Workflow domain model
- `src/WorkflowEngine.Models/EngineRequest.cs` - Internal request representation
- `src/WorkflowEngine.Api/WorkflowExecutor.cs` - Executes steps, sends callbacks
- `src/WorkflowEngine.Api/Engine.cs` / `Engine.IO.cs` - Main engine loop, enqueue
- `src/WorkflowEngine.Data/Entities/WorkflowEntity.cs` - Database entity
- `src/WorkflowEngine.Data/Repository/` - Data access layer

## Phase 1: Models

### 1.1 Modify: `src/WorkflowEngine.Models/ProcessNextRequest.cs`

Add a `State` property. This is the opaque blob the app sends with the initial request:

```csharp
/// <summary>
/// Opaque application state. The engine stores this and echoes it back with each callback.
/// The engine never inspects or interprets this value.
/// </summary>
[JsonPropertyName("state")]
public required JsonElement State { get; init; }
```

### 1.2 Modify: `src/WorkflowEngine.Models/AppCallbackPayload.cs`

Add a `State` property to echo the state back to the app with each callback:

```csharp
/// <summary>
/// Opaque application state from the initial request or the last callback response.
/// </summary>
[JsonPropertyName("state")]
public required JsonElement State { get; init; }
```

### 1.3 New file: `src/WorkflowEngine.Models/AppCallbackResponse.cs`

The response body from successful app callbacks. Currently the engine ignores the response body on success — now it needs to read it:

```csharp
/// <summary>
/// Response returned by the application after successful command execution.
/// </summary>
public sealed record AppCallbackResponse
{
    /// <summary>
    /// Optional command-specific response payload.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    /// <summary>
    /// Updated opaque application state. Replaces the stored state for subsequent steps.
    /// </summary>
    [JsonPropertyName("state")]
    public required JsonElement State { get; init; }
}
```

### 1.4 Modify: `src/WorkflowEngine.Models/EngineRequest.cs`

Add `State` parameter to the record. Update `ProcessNextRequest.ToEngineRequest` to pass it through.

### 1.5 Modify: `src/WorkflowEngine.Models/Workflow.cs`

Add mutable `State` property (needs `set` because it's updated after each callback):

```csharp
/// <summary>
/// Opaque application state. Updated after each successful callback.
/// </summary>
public JsonElement? State { get; set; }
```

Update `FromRequest` to populate from `EngineRequest.State`.

## Phase 2: Persistence

### 2.1 Modify: `src/WorkflowEngine.Data/Entities/WorkflowEntity.cs`

Add a column for the state:

```csharp
[Column(TypeName = "jsonb")]
public string? StateJson { get; set; }
```

Update `FromDomainModel` to serialize `workflow.State` to string:
```csharp
StateJson = workflow.State.HasValue
    ? JsonSerializer.Serialize(workflow.State.Value)
    : null
```

Update `ToDomainModel` to deserialize back:
```csharp
State = StateJson != null
    ? JsonSerializer.Deserialize<JsonElement>(StateJson)
    : null
```

### 2.2 EF Core Migration

Create a migration adding the `StateJson` JSONB column to the `Workflows` table. Nullable.

### 2.3 Modify: Repository update methods

Find wherever `Workflow` entities are batch-updated or saved (e.g., `BatchUpdateWorkflowAndSteps` in the repository). Ensure `StateJson` is included in the update. The state changes on every successful callback, so it must be persisted when the workflow is flushed to the database.

Look for patterns like:
```csharp
workflowEntry.Property(e => e.Status).IsModified = true;
```
Add the equivalent for `StateJson`.

## Phase 3: Callback Execution

### 3.1 Modify: `src/WorkflowEngine.Api/WorkflowExecutor.cs`

This is the core change. In the `AppCommand` method:

**Before (current):**
- Builds `AppCallbackPayload` with `CommandKey`, `Actor`, `LockToken`, `Payload`
- POSTs to app
- On 2xx: returns `ExecutionResult.Success()` (ignores response body)

**After:**
- Builds `AppCallbackPayload` with `CommandKey`, `Actor`, `LockToken`, `Payload`, **`State = workflow.State`**
- POSTs to app
- On 2xx: **reads response body** as `AppCallbackResponse`, **updates** `workflow.State = response.State`
- Returns `ExecutionResult.Success()`

Pseudocode for the change:
```csharp
var payload = new AppCallbackPayload
{
    CommandKey = command.CommandKey,
    Actor = step.Actor,
    LockToken = workflow.InstanceLockKey ?? throw ...,
    Payload = command.Payload,
    State = workflow.State ?? default,  // include state
};

// ... existing HTTP POST ...

if (response.IsSuccessStatusCode)
{
    // Read updated state from response
    var callbackResponse = await response.Content.ReadFromJsonAsync<AppCallbackResponse>(cancellationToken);
    if (callbackResponse?.State.ValueKind is not null and not JsonValueKind.Undefined)
    {
        workflow.State = callbackResponse.State;
        workflow.HasPendingChanges = true; // ensure state is flushed to DB
    }
    return ExecutionResult.Success();
}
```

Note: Check how `workflow.HasPendingChanges` (or equivalent) works in the codebase. The state update needs to be flushed to the database before the next step executes.

### 3.2 Verify: `Engine.cs` / `Engine.IO.cs`

Verify that when a workflow is enqueued from a `ProcessNextRequest`, the `State` flows through:
- `ProcessNextRequest` → `EngineRequest` (via `ToEngineRequest`) → `Workflow` (via `FromRequest`)

The state should be stored on the `Workflow` from the moment it's created.

## Phase 4: Tests

### 4.1 Unit tests for WorkflowExecutor

- Verify `AppCallbackPayload` sent to app includes `State` from workflow
- Verify response body is deserialized and `workflow.State` is updated on success
- Verify `workflow.State` is NOT updated on failure (non-2xx)

### 4.2 Unit tests for models

- Round-trip serialization of `ProcessNextRequest` with `State`
- Round-trip serialization of `AppCallbackResponse`

### 4.3 Integration tests

- End-to-end: submit workflow with state → verify callbacks include state → verify updated state flows to next callback

## Build & Verify

```bash
dotnet build
dotnet test
```

## Summary of changes

| File | Change |
|------|--------|
| `ProcessNextRequest.cs` | Add `State` property |
| `AppCallbackPayload.cs` | Add `State` property |
| `AppCallbackResponse.cs` | **New file** |
| `EngineRequest.cs` | Add `State` parameter, pass through |
| `Workflow.cs` | Add `State` property, populate in `FromRequest` |
| `WorkflowEntity.cs` | Add `StateJson` column, mapping |
| Repository methods | Include `StateJson` in updates |
| `WorkflowExecutor.cs` | Include state in callback, read response, update state |
| EF Migration | Add `StateJson` column |
