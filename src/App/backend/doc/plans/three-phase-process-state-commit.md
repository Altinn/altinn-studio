# Plan: Three-Phase Process State Commit

## TL;DR

The process state is never actually saved to Storage during workflow engine callbacks. `UpdateProcessStateInStorage` sets `instance.Process` in memory, but the callback controller only persists data elements. We need to fix this, and in doing so, we should rethink how the commit works.

**Core insight:** Persisting the process state is not business logic — it's the commit boundary of a transition. It should not be a regular command going through the same `IWorkflowEngineCommand` interface as task logic. Instead, it should be a first-class concept in the protocol between the app and the workflow engine.

**Proposed change:** Replace the flat list of steps (where one command secretly is the commit) with an explicit three-phase structure on `ProcessNextRequest`:

```
1. Steps            — Business logic (end old task, start new task, lock data, etc.)
2. CommitPayload    — Process state + instance events, saved via dedicated endpoint
3. PostCommitSteps  — Side effects (Altinn events, service task execution)
```

The current code also commits per-event (twice for a Task_1->Task_2 transition). This was an exploration of saving after each event, but it doesn't work well in practice — the `ProcessState` data model doesn't support an intermediate "between tasks" state. We match the old `ProcessEngine` behavior: one commit per transition.

**Note:** This means that while running TaskStart logic for Task_2, `CurrentTask` in Storage is still Task_1. Authorization during the transition window is based on the old task. This is a known limitation of the single-commit model — the same trade-off the old `ProcessEngine` made.

**Changes span two repos:** `app-lib-dotnet` (new commit endpoint, rewrite factory, remove command) and `altinn-studio` workflow engine (support new request structure, call commit endpoint).

---

## Background

### The old flow (ProcessEngine on main)

In the old synchronous `ProcessEngine`, a "process next" transition worked like this:

1. Authorization + validation
2. User action / service task handlers run (mutate data, data elements saved)
3. `HandleMoveToNext()`:
   a. `MoveProcessStateToNextAndGenerateEvents()` — builds ProcessStateChange in memory
   b. `HandleEventsAndUpdateStorage()` — calls `_instanceClient.UpdateProcessAndEvents(instance, events)` — **one atomic save**
   c. `RegisterEventWithEventsComponent()` — publishes to Altinn Events (side effect)

Key: One commit per transition, after all work is done. Data saved before process state.

### The new flow (workflow engine callbacks)

The workflow engine is a separate service. The app sends it a `ProcessNextRequest` containing a flat list of `StepRequest` objects. The engine calls back to the app for each step sequentially.

Current `ProcessNextRequestFactory` builds the request like this:

```csharp
foreach (InstanceEvent instanceEvent in processStateChange.Events ?? [])
{
    commands.AddRange(workflowCommands.Commands);
    commands.Add(CreateUpdateProcessStateCommand(processStateChange)); // BUG: duplicated per event
    commands.AddRange(workflowCommands.PostProcessNextCommittedCommands);
}
```

For a Task_1 -> Task_2 transition (EndTask + StartTask events), this produces:
```
[EndTask cmds] → [UpdateProcessState] → [StartTask cmds] → [UpdateProcessState] → [MovedToAltinnEvent]
```

**Three issues:**
1. `UpdateProcessState` only sets `instance.Process` in memory. The callback controller's save path (`InstanceDataUnitOfWork`) only persists data elements — never `Instance.Process`. So the process state is never written to Storage.
2. The commit is duplicated — same `ProcessStateChange` committed twice. This was an exploration of per-event saving, but the `ProcessState` data model doesn't support an intermediate "between tasks" state, so it doesn't work. We need one commit per transition, matching the old `ProcessEngine` behavior.
3. EndTask commands and StartTask commands are separated by a commit, rather than running all work first and committing once.

### Why not just fix the save path?

We discussed several options:
- **Extend `InstanceDataUnitOfWork`** — scope creep, it's designed for data elements
- **Separate `ProcessStateUnitOfWork`** — adds a new concept only one command uses
- **Have the command call `IInstanceClient` directly** — the command runs before data element saves in the controller, wrong ordering
- **Controller orchestrates after command** — makes the generic controller process-state-aware

None felt right. The root cause is that persisting process state shouldn't be a command at all.

---

## Proposed Design

### ProcessNextRequest with explicit phases

```csharp
public sealed record ProcessNextRequest
{
    public required string CurrentElementId { get; init; }
    public required string DesiredElementId { get; init; }
    public required Actor Actor { get; init; }
    public required string LockToken { get; init; }

    // Phase 1: Business logic commands (AppCommand callbacks)
    public required IEnumerable<StepRequest> Steps { get; init; }

    // Phase 2: Process state + events to persist (dedicated commit endpoint)
    public required string CommitPayload { get; init; }

    // Phase 3: Post-commit side effects (AppCommand callbacks, independently retriable)
    public IEnumerable<StepRequest>? PostCommitSteps { get; init; }
}
```

### Workflow engine execution

The engine processes the three phases in order:
1. Call `POST /{commandKey}` for each Step (existing AppCommand callback)
2. Call `POST /commit-process-state` with CommitPayload (new dedicated endpoint)
3. Call `POST /{commandKey}` for each PostCommitStep (existing AppCommand callback)

If a work step fails → workflow fails, commit never happens.
If the commit fails → engine retries it (idempotent). Post-commit steps don't start.
If a post-commit step fails → the commit is already durable. The step is retried independently.

### App commit endpoint

New endpoint on `WorkflowEngineCallbackController`:

```csharp
[HttpPost("commit-process-state")]
public async Task<IActionResult> CommitProcessState(...)
{
    // 1. Fetch instance from Storage
    // 2. Deserialize ProcessStateChange from payload
    // 3. instance.Process = processStateChange.NewProcessState
    // 4. _instanceClient.UpdateProcessAndEvents(instance, events)
    // 5. Return Ok()
}
```

Simple, focused, no `InstanceDataUnitOfWork` involved.

### Updated ProcessNextRequestFactory

```csharp
var allWorkCommands = new List<StepRequest>();
var allPostCommitCommands = new List<StepRequest>();

foreach (InstanceEvent instanceEvent in processStateChange.Events ?? [])
{
    var workflowCommands = GetWorkflowStepsForInstanceEvent(...);
    if (workflowCommands != null)
    {
        allWorkCommands.AddRange(workflowCommands.Commands);
        allPostCommitCommands.AddRange(workflowCommands.PostProcessNextCommittedCommands);
    }
}

return new ProcessNextRequest
{
    Steps = allWorkCommands,
    CommitPayload = JsonSerializer.Serialize(processStateChange),
    PostCommitSteps = allPostCommitCommands.Count > 0 ? allPostCommitCommands : null,
    ...
};
```

One commit per transition. Work from all events collected first.

### Post-commit side effects: only from TaskStart and ProcessEnd

`WorkflowCommandSet` already enforces this correctly:
- **TaskStart** → `MovedToAltinnEvent`, optionally `ExecuteServiceTask` and `InstanceCreatedAltinnEvent`
- **ProcessEnd** → `CompletedAltinnEvent`
- **TaskEnd** → no post-commit commands
- **TaskAbandon** → no post-commit commands

These are reactions to the completed transition ("we've moved to Task_2, now tell the world"), not part of executing it.

---

## Changes by Repository

### App library (`app-lib-dotnet`)

| Change | File |
|--------|------|
| Add `CommitPayload` + `PostCommitSteps` to model | `src/.../WorkflowEngine/Models/ProcessNextRequest.cs` |
| Add commit endpoint | `src/.../Controllers/WorkflowEngineCallbackController.cs` |
| Add `CommitProcessStateCallbackPayload` model | New file in Models/ |
| Rewrite factory (per-transition, not per-event) | `src/.../WorkflowEngine/ProcessNextRequestFactory.cs` |
| **Delete** UpdateProcessStateInStorage command | `src/.../WorkflowEngine/Commands/UpdateProcessStateInStorage.cs` |
| Remove DI registration | `src/.../WorkflowEngine/DependencyInjection/ServiceCollectionExtensions.cs` |
| Remove from validator | `src/.../WorkflowEngine/DependencyInjection/WorkflowEngineCommandValidator.cs` |
| Remove payload from JSON context | `src/.../WorkflowEngine/Commands/_Base/CommandPayload.cs` |
| Update test client for three phases | `test/.../FakeWorkflowEngineClient.cs` |

### Workflow engine (`altinn-studio`)

| Change | File |
|--------|------|
| Add `CommitPayload` + `PostCommitSteps` to request model | `.../Endpoints/ProcessNextRequest.cs` |
| Update request-to-workflow conversion | `.../Endpoints/ProcessNextRequest.cs` (`ToEngineRequest`) |
| Handle commit phase in executor | `.../Engine/WorkflowExecutor.cs` |
| Add phase marker to Step or Workflow model | `.../Domain/Step.cs` or `.../Domain/Workflow.cs` |
| Update step processing loop | `.../Engine/Engine.cs` (`ProcessSteps`) |
| Add commit endpoint config | `.../Configuration/AppCommandSettings.cs` (or derive from existing) |

---

## Open Questions for Discussion

1. **Commit endpoint auth** — Should the commit endpoint use the same API key auth as the command callback? (Probably yes, for simplicity.)
2. **Post-commit failure semantics** — If a post-commit step permanently fails (exhausts retries), should the workflow be marked as failed? The commit is durable regardless. Could add a `critical: bool` field to steps later, but not needed initially.
3. **Commit retry strategy** — What retry strategy for the commit itself? It's idempotent, so aggressive retries are safe. Use the engine's default retry strategy.
