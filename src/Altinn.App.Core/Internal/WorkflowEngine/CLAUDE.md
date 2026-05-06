# Workflow Engine Integration Layer

App-lib integration with the async Workflow Engine service. The engine runs as a separate service; this code handles **sending requests** and **receiving callbacks**.

## Architecture

The Workflow Engine service (external, .NET, PostgreSQL-backed) orchestrates process transitions. This integration layer:

1. **Outbound**: `ProcessNextRequestFactory` builds a `WorkflowEnqueueBundle` (containing `WorkflowEnqueueRequest` body + metadata) and `WorkflowEngineClient` POSTs it to the engine's enqueue endpoint (`POST {ApiWorkflowEngineEndpoint}/{namespace}/workflows`). Namespace is sent in the URL path, idempotency key and correlation ID are sent via HTTP headers (`Idempotency-Key`, `Correlation-Id`). Context (`AppWorkflowContext`) carries actor, lock token, org/app, and instance identification. `Namespace` = `{org}/{app}` (isolation boundary), `CorrelationId` = `instanceGuid` (for querying all workflows for an instance).
2. **Inbound**: The engine calls back to `WorkflowEngineCallbackController` for each command, one at a time, sequentially
3. **Per-callback lifecycle**: Controller restores `InstanceDataUnitOfWork` from the opaque state blob, resolves the `IWorkflowEngineCommand` by key, executes it, commits data changes on success, captures updated state, and returns it to the engine

```
App ProcessNext API
  → Capture instance + form data into opaque state blob (InstanceStateService)
  → ProcessNextRequestFactory.Create()     (builds WorkflowEnqueueRequest from ProcessStateChange)
  → WorkflowEngineClient.EnqueueWorkflow() (HTTP POST to engine, returns WorkflowEnqueueResponse.Accepted)
  → Extract workflowId from response for status polling

Engine (external service)
  → Executes steps sequentially
  → For each AppCommand: POST to /workflow-engine-callbacks/{commandKey} (echoes state blob)

WorkflowEngineCallbackController.ExecuteCommand()
  → Restore InstanceDataUnitOfWork from state blob (InstanceStateService)
  → Resolve IWorkflowEngineCommand by key
  → command.Execute(context)
  → Save data changes on success, capture updated state blob, return to engine
  → (Engine uses returned state blob for next callback)
```

## Key Design Constraints

- **ALL commands MUST be idempotent** - the engine retries failed commands with configurable backoff
- **Commands run in separate HTTP requests** - each callback is independent; state is passed between commands via an opaque JSON blob (see State Passthrough below)
- **Three command phases**: task-end commands → `MutateProcessState` (in-memory state transition) → task-start commands → `SaveProcessStateToStorage` (persist to Storage) → post-commit commands
- **Authentication**: Callbacks use `[AllowAnonymous]` currently (TODO: X-Api-Key scheme). Data operations use `StorageAuthenticationMethod.ServiceOwner()`

## File Structure

```
WorkflowEngine/
├── CLAUDE.md
├── Commands/
│   ├── _Base/
│   │   ├── IWorkflowEngineCommand.cs        - Command interface (plain + generic with payload)
│   │   ├── WorkflowEngineCommandBase<T>.cs  - Base class for typed-payload commands
│   │   ├── ProcessEngineCommandContext.cs   - Context struct (AppId, InstanceId, Mutator, Payload, CT)
│   │   ├── ProcessEngineCommandResult.cs    - Success/Failed result types
│   │   ├── CommandPayload.cs                - Polymorphic JSON payload base + serializer + source gen context
│   │   └── ProcessTaskResolver.cs           - Resolves IProcessTask/IServiceTask by AltinnTaskType
│   ├── ProcessNext/
│   │   ├── TaskStart/
│   │   │   ├── UnlockTaskData.cs            - Unlock data elements for new task
│   │   │   ├── StartTaskLegacyHook  - Runs legacy IProcessTaskStart (obsolete API)
│   │   │   ├── OnTaskStartingHook.cs        - Runs IOnTaskStartingHandler (new API, max 1 per task)
│   │   │   ├── CommonTaskInitialization.cs   - Auto-create data elements, prefill, remove task-generated data
│   │   │   └── StartTask.cs          - Calls IProcessTask.Start()
│   │   ├── TaskEnd/
│   │   │   ├── EndTask.cs            - Calls IProcessTask.End()
│   │   │   ├── CommonTaskFinalization.cs    - Remove hidden data, shadow fields, AltinnRowIds
│   │   │   ├── EndTaskLegacyHook.cs         - Runs legacy IProcessTaskEnd (obsolete API)
│   │   │   ├── OnTaskEndingHook.cs          - Runs IOnTaskEndingHandler (new API, max 1 per task)
│   │   │   └── LockTaskData.cs              - Lock data elements after task completes
│   │   ├── TaskAbandon/
│   │   │   ├── AbandonTask.cs
│   │   │   ├── OnTaskEndingHook.cs          - (reused from TaskEnd namespace - runs IOnTaskAbandonHandler)
│   │   │   └── AbandonTaskLegacyHook.cs
│   │   └── ProcessEnd/
│   │       ├── OnProcessEndingHook.cs      - Runs IOnProcessEndingHandler (pre-commit)
│   │       ├── EndProcessLegacyHook.cs      - Runs legacy IProcessEnd (post-commit)
│   │       ├── DeleteDataElements.cs        - Auto-delete data types with AutoDeleteOnProcessEnd (post-commit)
│   │       └── DeleteInstance.cs            - Hard-delete instance if ApplicationMetadata.AutoDeleteOnProcessEnd (post-commit)
│   ├── AltinnEvents/
│   │   ├── MovedToAltinnEvent.cs            - Fires movedTo.{taskId} event (post-commit)
│   │   ├── CompletedAltinnEvent.cs          - Fires process.completed event (post-commit)
│   │   └── InstanceCreatedAltinnEvent.cs    - Fires instance.created event (post-commit, first task only)
│   ├── ExecuteServiceTask.cs                - Runs IServiceTask.Execute() (post-commit)
│   ├── MutateProcessState.cs                - Mutates in-memory process state between task-end and task-start
│   └── SaveProcessStateToStorage.cs         - Commits ProcessStateChange to Storage (the commit boundary)
├── DependencyInjection/
│   ├── ServiceCollectionExtensions.cs       - Registers all commands + client + helpers
│   └── WorkflowEngineCommandValidator.cs    - Startup check: all keys in WorkflowCommandSet are registered
├── Http/
│   ├── IWorkflowEngineClient.cs             - Enqueue, list, dependency-graph, cancel, and resume operations
│   └── WorkflowEngineClient.cs              - HTTP impl with X-Api-Key auth
├── Models/
│   ├── WorkflowEnqueueRequest.cs            - Batch request body (labels, context, list of WorkflowRequest)
│   ├── WorkflowRequest.cs                   - Single workflow (operationId, steps, state, dependsOn)
│   ├── WorkflowEnqueueResponse.cs           - Response: Accepted (with WorkflowResult[]) or Rejected
│   ├── StepRequest.cs                       - Single step (operationId + command + retryStrategy + metadata)
│   ├── Command.cs                           - CommandDefinition: flat record with type + data (JsonElement)
│   ├── AppCommandData.cs                    - Data for "app" commands (commandKey + payload)
│   ├── AppWorkflowContext.cs                - Context for app commands (actor, lockToken, org, app, party, guid)
│   ├── AppCallbackPayload.cs                - Payload engine sends back per callback (includes workflowId)
│   ├── Actor.cs                             - User/org identity for the request
│   ├── RetryStrategy.cs                     - Backoff config (Exponential/Linear/Constant + nonRetryableHttpStatusCodes)
│   ├── BackoffType.cs                       - Enum
│   ├── PersistentItemStatus.cs              - Enum (Enqueued/Processing/Requeued/Completed/Failed/Canceled/DependencyFailed)
│   ├── WorkflowStatusResponse.cs            - Full status response (databaseId, operationId, steps as StepStatusResponse)
│   ├── CallbackErrorResponse.cs             - Error response from callback controller
│   ├── AppCallbackResponse.cs               - Success response with updated state blob (nullable)
│   └── InstanceState.cs                     - Internal DTO for transported instance + form data state
├── InstanceStateService.cs                  - Captures/restores InstanceDataUnitOfWork to/from opaque state blob
├── ProcessNextRequestFactory.cs             - Maps ProcessStateChange → WorkflowEnqueueRequest
└── WorkflowCommandSet.cs                    - Defines command sequences per event type
```

## Command Sequences

Defined in `WorkflowCommandSet.cs`. `ProcessNextRequestFactory` assembles the full sequence:
1. Task-end/abandon commands (from `process_EndTask`/`process_AbandonTask` events)
2. `MutateProcessState` (inserted by factory if there are task-end/abandon commands)
3. Task-start and process-end commands (from `process_StartTask`/`process_EndEvent` events)
4. `SaveProcessStateToStorage` (always inserted by factory)
5. Post-commit commands

### Task-to-Task Transition (e.g., Task_1 → Task_2)
```
── instance.Process.CurrentTask = Task_1 (OLD) ──
EndTask → CommonTaskFinalization → EndTaskLegacyHook → OnTaskEndingHook → LockTaskData
  ── MutateProcessState (in-memory: CurrentTask → Task_2) ──
── instance.Process.CurrentTask = Task_2 (NEW) ──
UnlockTaskData → StartTaskLegacyHook → OnTaskStartingHook → CommonTaskInitialization → StartTask
  ── SaveProcessStateToStorage (persist to Storage) ──
MovedToAltinnEvent → [ExecuteServiceTask if service task]
```

### Task-to-End Transition (e.g., Task_1 → EndEvent)
```
── instance.Process.CurrentTask = Task_1 (OLD) ──
EndTask → CommonTaskFinalization → EndTaskLegacyHook → OnTaskEndingHook → LockTaskData
  ── MutateProcessState (in-memory: CurrentTask → null, EndEvent set) ──
OnProcessEndingHook
  ── SaveProcessStateToStorage (persist to Storage) ──
EndProcessLegacyHook → DeleteDataElementsIfConfigured → DeleteInstanceIfConfigured → CompletedAltinnEvent
```

### Initial Task Start (process just created)
```
── instance.Process.CurrentTask = Task_1 (already set by CreateInitialProcessState) ──
UnlockTaskData → StartTaskLegacyHook → OnTaskStartingHook → CommonTaskInitialization → StartTask
  ── SaveProcessStateToStorage (persist to Storage) ──
MovedToAltinnEvent → [ExecuteServiceTask if service task] → [InstanceCreatedAltinnEvent if first task]
```

### Task Abandon (reject → end)
```
── instance.Process.CurrentTask = Task_1 (OLD) ──
AbandonTask → OnTaskAbandonHook → AbandonTaskLegacyHook
  ── MutateProcessState (in-memory: CurrentTask → null or next task) ──
[OnProcessEndingHook if ending] / [task-start commands if moving to next task]
  ── SaveProcessStateToStorage (persist to Storage) ──
[post-commit commands]
```

## How to Add a New Command

1. **Create the command class** in the appropriate `Commands/` subfolder:
   - Without payload: implement `IWorkflowEngineCommand` directly
   - With typed payload: extend `WorkflowEngineCommandBase<TPayload>` and create a `record TPayload : CommandRequestPayload`

2. **If using a payload**: register it in `CommandPayload.cs`:
   - Add `[JsonDerivedType(typeof(MyPayload), typeDiscriminator: "myPayload")]` to `CommandRequestPayload`
   - Add `[JsonSerializable(typeof(MyPayload))]` to `CommandPayloadJsonContext`

3. **Register in DI**: add `services.AddTransient<IWorkflowEngineCommand, MyCommand>()` in `ServiceCollectionExtensions.cs`

4. **Add to sequence**: add to the appropriate method in `WorkflowCommandSet.cs` (use `AddCommand` for pre-commit, `AddPostProcessNextCommittedCommand` for post-commit)

5. **Startup validation**: `WorkflowEngineCommandValidator` will fail at startup if a key in `WorkflowCommandSet` isn't registered in DI

## Command Conventions

- Every command has `public static string Key => "..."` and `public string GetKey() => Key`
- Commands return `SuccessfulProcessEngineCommandResult` or `FailedProcessEngineCommandResult` (never throw from Execute)
- Commands get instance data through `context.InstanceDataMutator` (an `InstanceDataUnitOfWork`)
- The callback controller saves data changes after successful execution - commands don't need to persist data themselves (except `SaveProcessStateToStorage` which writes to the process/events API)
- Hook commands (OnTaskStarting/Ending, OnProcessEnding) enforce max 1 handler per task

## Interaction with Workflow Engine Service

The engine service (separate repo at `altinn-studio/src/Runtime/workflow-engine`):
- .NET service backed by PostgreSQL
- Receives `WorkflowEnqueueRequest`, stores it, executes steps sequentially
- Returns `WorkflowEnqueueResponse.Accepted` with `DatabaseId` and `Namespace` per workflow
- Calls back to the app via HTTP POST for each `AppCommand`
- Retries failed steps with configurable backoff (default: exponential, 1s base, 5min max delay, 24h max duration)
- `Namespace` = `{org}/{app}` is the primary isolation boundary; idempotency keys are unique within a namespace
- `CorrelationId` = `instanceGuid` groups workflows per instance for status queries
- Steps execute in order; previous step must complete before next begins
- `Context` (`AppWorkflowContext`) is opaque to the engine; passed through to command handlers
- Commands use `CommandDefinition` with `type: "app"` and `data: AppCommandData { commandKey, payload }`

### URL Patterns
- Enqueue: `POST {ApiWorkflowEngineEndpoint}/{namespace}/workflows` with `Idempotency-Key` header (required) and `Correlation-Id` header (optional)
- Dependency graph: `GET {ApiWorkflowEngineEndpoint}/{namespace}/workflows/{workflowId}/dependency-graph`
- List active: `GET {ApiWorkflowEngineEndpoint}/{namespace}/workflows?correlationId={correlationId}` — returns `PaginatedResponse<WorkflowStatusResponse>`
- Cancel: `POST {ApiWorkflowEngineEndpoint}/{namespace}/workflows/{workflowId}/cancel`
- Resume: `POST {ApiWorkflowEngineEndpoint}/{namespace}/workflows/{workflowId}/resume?cascade={bool}`

## State Passthrough

Each callback needs an `InstanceDataUnitOfWork` (instance + form data). Rather than fetching from Storage on every callback (which would see stale process state), the app captures instance + form data into an opaque `JsonElement` blob that the engine stores and echoes back with each callback.

**Capture point**: `ProcessEngine.HandleMoveToNext` captures state BEFORE `MoveProcessStateToNextAndGenerateEvents` mutates `instance.Process`. This means the blob carries the OLD process state (CurrentTask = the task being left). `MutateProcessState` transitions the in-memory state to the new task between the two command groups.

**Flow**:
1. `InstanceStateService.CaptureState` → serializes instance + form data into `InstanceState` → `JsonElement`
2. State blob is included in `WorkflowRequest.State`
3. Engine echoes it back in `AppCallbackPayload.State` for each callback
4. `InstanceStateService.RestoreState` → deserializes, creates `InstanceDataUnitOfWork` with preloaded form data
5. After command execution, updated state is captured and returned in `AppCallbackResponse.State`
6. Engine uses the returned state for the next callback — state evolves command by command

**Why commands read from `instance.Process.CurrentTask`**: In the old ProcessEngine, task-end/start handlers received `taskId` as an explicit parameter (extracted from the event's `ProcessInfo`). The new commands read directly from `instance.Process.CurrentTask` instead — simpler, single source of truth. `MutateProcessState` ensures each command group sees the correct CurrentTask.

## Authorization and Data Saves (current plan)

All data saves during callbacks use `StorageAuthenticationMethod.ServiceOwner()`. This is a change from the old ProcessEngine where data operations used the end user's token.

**Current design**: The app (ServiceOwner) performs all data writes during process transitions. The user authorized the action (e.g., "confirm", "reject") at the ProcessNext API entry point. After that, the app executes the transition as ServiceOwner. This means:
- **policy.xml must grant ServiceOwner write rights on all tasks** — this is a prerequisite for the workflow engine
- Storage's authorization service checks the ServiceOwner identity (from the token), not the original user
- The task in Storage's XACML resource comes from `instance.Process.CurrentTask` as persisted in Storage's DB

**Implication for task-start data saves**: Between `MutateProcessState` and `SaveProcessStateToStorage`, task-start commands create/modify data while Storage still has the OLD task as current. This works because ServiceOwner has write access on all tasks. If Storage ever starts forwarding the real userId to the authorization service (e.g., via a header), we would need to persist the process state between the two command groups instead. The factory already separates `taskEndSteps` and `taskStartSteps`, so moving the `SaveProcessStateToStorage` insert point would be straightforward.

## Known TODOs / In-Progress

- Authentication on callback controller: currently `[AllowAnonymous]`, should use X-Api-Key scheme
- `DeleteDataElementsIfConfigured` and `DeleteInstanceIfConfigured` are wired into process end sequence (post-commit)
- `Actor.UserIdOrOrgNumber` could use a more specific type
- `AppCallbackPayload.LockToken` naming inconsistency with engine (LockKey vs LockToken)
- "Go to next task after service task" - automatic progression not yet reimplemented
