# Merge Guide: feature/workflow-engine-abstraction-poc → feature/workflow-engine

## Strategy

Rebase or merge `feature/workflow-engine-abstraction-poc` onto the latest `feature/workflow-engine`. The parent branch is actively developed, so expect conflicts. A rebase is cleaner but given the mega-commit size, merge may be more practical.

## High-Conflict Files

These files were heavily rewritten on our branch and are likely to have parallel changes on the parent:

| File | Risk | Notes |
|------|------|-------|
| `Engine.cs` | **HIGH** | `ValidateCommands()` completely rewritten. Any parent-branch changes to validation logic will conflict. |
| `WorkflowExecutor.cs` | **HIGH** | Centralized deserialization added. Parent may have added new catch clauses or execution logic. |
| `ServiceCollectionExtensions.cs` | **HIGH** | Registration API changed (`AddCommand` vs `AddCommandHandler`). Parent may have added new registrations. |
| `CommandExecutionContext.cs` | **MEDIUM** | Properties renamed/added. Parent may reference old property names. |
| `CommandHandlerRegistry.cs` → `CommandRegistry.cs` | **MEDIUM** | File renamed + rewritten. Git may not track the rename. |
| `AppCommandHandler.cs` → `AppCommandDescriptor.cs` | **MEDIUM** | File renamed + rewritten. Same rename tracking concern. |
| `WebhookCommandHandler.cs` → `WebhookCommandDescriptor.cs` | **MEDIUM** | Same. |
| Test fixtures | **MEDIUM** | Test infrastructure changed significantly. |

## Merge Considerations

### 1. Deleted file: `ICommandHandler.cs`
Any parent-branch code referencing `ICommandHandler` must be migrated to `ICommandDescriptor`. Search for:
- `ICommandHandler` (interface references)
- `AddCommandHandler` (registration calls)
- `CommandHandler` (class names, variable names)

### 2. Renamed files
Git may not detect renames if the content changed significantly (>50% different). Be prepared to:
- Manually resolve "deleted on one side, modified on the other" conflicts
- Accept our version for renamed files and manually apply any parent-branch logic changes

### 3. New command handlers on parent branch
If the parent branch added new `ICommandHandler` implementations, they need to be converted to the descriptor pattern:
- Create a class extending `CommandDescriptor<TData>` or `CommandDescriptor<TData, TContext>`
- Move deserialization logic out of the handler (the engine does it now)
- Register with `AddCommand<T>()` instead of `AddCommandHandler<T>()`

### 4. Route change (tenantId removal)
Our branch removed `{tenantId}` from the API route. If parent branch added new endpoints or tests referencing `tenantId` in the route, those need updating.

### 5. Core/App split
Any new files added to `WorkflowEngine.Api` on the parent branch need to be evaluated:
- Engine/processing logic → stays in `WorkflowEngine.Core`
- App-specific composition → moves to `WorkflowEngine.App`
- New command handlers → `WorkflowEngine.CommandHandlers`

### 6. Namespace preservation
We kept the `WorkflowEngine.Api` namespace in Core even after splitting. Don't be confused by this — it's intentional to minimize churn.

### 7. GlobalUsings.cs
`WorkflowEngine.Core/GlobalUsings.cs` exists because Core uses `Microsoft.NET.Sdk` (not Web). If the parent added files to the old Api project that rely on implicit web usings, they'll need these globals.

## Verification Checklist

After merge:
1. `dotnet build src/Runtime/workflow-engine/WorkflowEngine.slnx` — core solution compiles
2. `dotnet build src/Runtime/workflow-engine-app/WorkflowEngine.App.slnx` — app solution compiles
3. `dotnet test src/Runtime/workflow-engine/WorkflowEngine.slnx` — all tests pass
4. Search for any remaining references to `ICommandHandler`, `AddCommandHandler`, `CommandHandlerRegistry`
5. Verify no duplicate `CommandType` registrations (would throw at startup)
6. Run CSharpier: `dotnet csharpier format src/Runtime/workflow-engine/`
7. Docker Compose smoke test: `docker compose --profile app up` and send a test workflow
