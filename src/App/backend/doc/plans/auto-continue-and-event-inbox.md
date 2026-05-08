# Plan: Auto-Continue for Service Tasks and Event Inbox

## Background and Context

### Architecture Overview

The codebase has two "process engines":

1. **BPMN ProcessEngine** (`src/Altinn.App.Core/Internal/Process/ProcessEngine.cs`): Lives in the app, understands BPMN semantics, task types, gateways, and flow navigation. This is the "brain" that decides what happens next.

2. **Workflow Engine** (`src/Altinn.App.ProcessEngine/`): A separate generic orchestration service that reliably executes jobs/commands with retries, persistence, and consistency. It's intentionally BPMN-agnostic - it just executes what it's told. This is the "heart" that provides the background job capability.

### The Problem

When a service task (PDF generation, eFormidling, etc.) completes, the process should automatically continue to the next task without user interaction. Previously, this was handled by a `do-while` loop in `ProcessEngine.Next()` on the main branch. With the new async workflow engine architecture, this loop was removed and there's no mechanism to trigger continuation.

### Design Decisions Made

1. **Same job, more tasks**: Instead of creating new jobs for continuation (which would need queue bypass logic), we append tasks to the existing job. The job stays "running" until the app says it's done.

2. **Completion callback**: After all tasks in a job complete, the workflow engine calls an "OnJobComplete" callback to the app. The app checks if the current task is a service task and returns additional tasks if so.

3. **Reuse existing logic**: The `OnJobCompleteHandler` calls `ProcessEngine.GenerateNextStateChange()` to reuse existing BPMN navigation logic, avoiding code duplication.

4. **Service task detection**: We use the existing `IServiceTask` interface to determine if a task should auto-continue. This maps directly to BPMN semantics - service tasks execute and complete, user tasks wait.

5. **Event inbox (future work)**: External events will be queued as jobs in the workflow engine, naturally waiting for any running job to complete. This prevents race conditions. Not implemented in this PR.

### Key Files to Understand

- `src/Altinn.App.Core/Internal/Process/ProcessEngine.cs` - BPMN engine, has `MoveProcessStateToNextAndGenerateEvents`
- `src/Altinn.App.Core/Internal/ProcessEngine/ProcessNextRequestFactory.cs` - Creates commands from state changes
- `src/Altinn.App.ProcessEngine/ProcessEngine.cs` - Workflow engine main loop
- `src/Altinn.App.ProcessEngine/ProcessEngineTaskHandler.cs` - Executes commands via HTTP callbacks
- `test/Altinn.App.Api.Tests/InProcessProcessEngineClient.cs` - Test infrastructure that simulates workflow engine

### Related Work

- The redis caching plan (`doc/plans/redis-caching-for-process-engine.md`) adds `LockToken` to callbacks for caching - this work is compatible with that.
- The current branch `feature/process-engine-next-bt` has the workflow engine infrastructure already in place.

---

## Implementation Guidelines (for AI agents)

Before implementing, read and follow these rules:

### 1. Read Before Writing
- **Always read existing files** before modifying them - don't assume structure
- Check `CLAUDE.md` in the repo root for project-specific coding standards
- Look at similar existing code for patterns (e.g., other callback handlers, repository methods)

### 2. Follow Existing Patterns
- Match the codebase's naming conventions, formatting, and style
- Use `internal` accessibility by default (per CLAUDE.md)
- Use `sealed` for classes unless inheritance is needed
- Don't add XML doc comments unless the existing code has them in similar places

### 3. Implement Incrementally
- Complete one phase fully before starting the next
- Build (`dotnet build`) after each phase to catch errors early
- Don't skip phases or combine them

### 4. Keep It Minimal
- Implement exactly what the plan specifies - no extras
- Don't refactor surrounding code
- Don't add "nice to have" features
- If something seems missing from the plan, ask rather than invent

### 5. Testing
- Focus on ensuring the build succeeds: `dotnet build solutions/All.sln`
- Update `InProcessProcessEngineClient` to use the new pattern so existing tests pass
- Don't add new unit tests unless specifically requested

### 6. File Locations
- ProcessEngine models go in `src/Altinn.App.ProcessEngine/Models/`
- Core handlers go in `src/Altinn.App.Core/Internal/ProcessEngine/`
- Follow the existing folder structure - don't create new folders unless necessary

### 7. Checklist (mark as you complete)

```
Phase 1: Callback Contract (ProcessEngine project)
[ ] Create OnJobCompleteRequest.cs (includes CompletedElementId for idempotency)
[ ] Create OnJobCompleteResponse.cs
[ ] Build succeeds

Phase 2: Repository Update (ProcessEngine project)
[ ] Add AddTasksToJob to IProcessEngineRepository
[ ] Implement in ProcessEnginePgRepository
[ ] Implement in ProcessEngineInMemoryRepository
[ ] Build succeeds

Phase 3: Job Model Update (ProcessEngine project)
[ ] Add DesiredElementId to ProcessEngineJobRequest
[ ] Update ProcessNextRequest.ToProcessEngineRequest to pass DesiredElementId
[ ] Add DesiredElementId property to ProcessEngineJob
[ ] Add AppendTasks method to ProcessEngineJob
[ ] Build succeeds

Phase 4: Task Handler Update (ProcessEngine project)
[ ] Add CallOnJobComplete method to IProcessEngineTaskHandler
[ ] Implement in ProcessEngineTaskHandler
[ ] Build succeeds

Phase 5: ProcessEngine Update (ProcessEngine project)
[ ] Modify ProcessJob to call completion callback
[ ] Append tasks and persist on non-empty response
[ ] Build succeeds

Phase 6: Expose State Change Generation (Core project)
[ ] Add GenerateNextStateChange to IProcessEngine interface
[ ] Implement in ProcessEngine (expose existing MoveProcessStateToNextAndGenerateEvents)
[ ] Build succeeds

Phase 7: App Handler (Core project)
[ ] Create IOnJobCompleteHandler interface
[ ] Create OnJobCompleteHandler implementation (reuses ProcessEngine.GenerateNextStateChange)
[ ] Register in ServiceCollectionExtensions
[ ] Build succeeds

Phase 8: Controller Endpoint (Api project)
[ ] Add on-job-complete endpoint to ProcessEngineCallbackController
[ ] Build succeeds

Phase 9: Test Infrastructure
[ ] Update InProcessProcessEngineClient to use OnJobCompleteHandler
[ ] Existing service task tests pass
[ ] Build succeeds

Final
[ ] Full build succeeds: dotnet build solutions/All.sln
[ ] Service task tests pass
```

---

## Problem Statement

The new Process Engine architecture executes commands via HTTP callbacks. When a service task completes, the process should automatically continue to the next task without requiring user interaction. Currently, there's no mechanism to trigger this continuation.

Additionally, external events (webhooks, Altinn events) can arrive while a job is still running, causing race conditions.

## Goals

1. **Auto-continue**: After a service task completes, automatically move to the next task
2. **Event inbox**: Queue external events as jobs so they wait for running jobs to complete

## Key Insight: Same Job, More Tasks

Instead of creating new jobs for continuation (which would need queue bypass logic), we append tasks to the existing job:

```
Job starts with tasks [A, B, C]
    │
    ▼
Tasks A, B, C complete
    │
    ▼
Workflow Engine: "OnJobComplete" callback
    │
    ▼
App returns: [D, E, F] (more tasks for THIS job)
    │
    ▼
Workflow Engine appends tasks to job, continues processing
    │
    ▼
Tasks D, E, F complete
    │
    ▼
Workflow Engine: "OnJobComplete" callback
    │
    ▼
App returns: [] (empty = truly done)
    │
    ▼
Job is complete, check queue
```

**Benefits:**
- No queue bypass logic - same job is still "running"
- Instance lock maintained naturally (job hasn't finished)
- Simple mental model: "job grows until app says stop"
- Better tracking - one job ID for entire process chain
- Events in queue wait naturally (instance has running job)

---

## Implementation Steps

### Phase 1: Callback Contract

**File:** `src/Altinn.App.ProcessEngine/Models/OnJobCompleteRequest.cs` (new)

```csharp
using System.Text.Json.Serialization;

namespace Altinn.App.ProcessEngine.Models;

/// <summary>
/// Request sent to app when all tasks in a job have completed.
/// </summary>
public sealed record OnJobCompleteRequest
{
    /// <summary>
    /// Information about the instance this job is for.
    /// </summary>
    [JsonPropertyName("instanceInformation")]
    public required InstanceInformation InstanceInformation { get; init; }

    /// <summary>
    /// The actor (user/org) that initiated this job.
    /// </summary>
    [JsonPropertyName("actor")]
    public required ProcessEngineActor Actor { get; init; }

    /// <summary>
    /// The BPMN element ID that was current when the job completed.
    /// Used for idempotency - the app can detect duplicate callbacks by checking if
    /// the current task has already moved past this element.
    /// </summary>
    [JsonPropertyName("completedElementId")]
    public required string CompletedElementId { get; init; }
}
```

**File:** `src/Altinn.App.ProcessEngine/Models/OnJobCompleteResponse.cs` (new)

```csharp
using System.Text.Json.Serialization;

namespace Altinn.App.ProcessEngine.Models;

/// <summary>
/// Response from app's completion callback.
/// </summary>
public sealed record OnJobCompleteResponse
{
    /// <summary>
    /// Additional tasks to append to the current job.
    /// Empty collection means the job is truly complete.
    /// </summary>
    [JsonPropertyName("additionalTasks")]
    public IReadOnlyList<ProcessEngineCommandRequest> AdditionalTasks { get; init; } = [];

    /// <summary>
    /// The BPMN element that the additional tasks will move the instance to.
    /// Used for the next OnJobComplete callback's CompletedElementId.
    /// </summary>
    [JsonPropertyName("targetElementId")]
    public string? DesiredElementId { get; init; }
}
```

### Phase 2: Repository Update

**File:** `src/Altinn.App.ProcessEngine/Data/IProcessEngineRepository.cs`

Add method:

```csharp
Task<IReadOnlyList<ProcessEngineTask>> AddTasksToJob(
    long jobId,
    IEnumerable<ProcessEngineTask> tasks,
    CancellationToken cancellationToken = default);
```

**File:** `src/Altinn.App.ProcessEngine/Data/ProcessEnginePgRepository.cs`

Add implementation:

```csharp
public async Task<IReadOnlyList<ProcessEngineTask>> AddTasksToJob(
    long jobId,
    IEnumerable<ProcessEngineTask> tasks,
    CancellationToken cancellationToken = default) =>
    await ExecuteWithRetry(
        async ct =>
        {
            var entities = tasks.Select(t =>
            {
                var entity = ProcessEngineTaskEntity.FromDomainModel(t);
                entity.JobId = jobId;
                return entity;
            }).ToList();

            _context.Tasks.AddRange(entities);
            await _context.SaveChangesAsync(ct);

            // Return with database IDs populated
            return entities.Select(e => e.ToDomainModel()).ToList() as IReadOnlyList<ProcessEngineTask>;
        },
        cancellationToken);
```

**File:** `src/Altinn.App.ProcessEngine/Data/ProcessEngineInMemoryRepository.cs`

Add implementation:

```csharp
public Task<IReadOnlyList<ProcessEngineTask>> AddTasksToJob(
    long jobId,
    IEnumerable<ProcessEngineTask> tasks,
    CancellationToken cancellationToken = default)
{
    // In-memory implementation for testing
    var result = tasks.ToList() as IReadOnlyList<ProcessEngineTask>;
    return Task.FromResult(result);
}
```

### Phase 3: Job Model Update

**File:** `src/Altinn.App.ProcessEngine/Models/ProcessEngineJobRequest.cs`

Add property to track the element the job moves to:

```csharp
/// <summary>
/// A request to enqueue one or more task in the process engine.
/// </summary>
/// <param name="Key">The job identifier. A unique-ish keyword describing the job.</param>
/// <param name="InstanceInformation">Information about the instance this job relates to.</param>
/// <param name="Actor">The actor this request is executed on behalf of.</param>
/// <param name="Commands">The individual commands comprising this job.</param>
/// <param name="DesiredElementId">The BPMN element this job moves the instance to (for auto-continue callback).</param>
internal record ProcessEngineJobRequest(
    string Key,
    InstanceInformation InstanceInformation,
    ProcessEngineActor Actor,
    IEnumerable<ProcessEngineCommandRequest> Commands,
    string? DesiredElementId = null
)
{
    public bool IsValid() => Commands.Any();
};
```

**File:** `src/Altinn.App.ProcessEngine/Models/ProcessNextRequest.cs`

Update `ToProcessEngineRequest` to pass the DesiredElementId:

```csharp
internal ProcessEngineJobRequest ToProcessEngineRequest(InstanceInformation instanceInformation) =>
    new(
        $"{instanceInformation.InstanceGuid}/next/from-{CurrentElementId}-to-{DesiredElementId}",
        instanceInformation,
        Actor,
        Tasks,
        DesiredElementId: DesiredElementId
    );
```

**File:** `src/Altinn.App.ProcessEngine/Models/ProcessEngineJob.cs`

Add property and update `FromRequest`:

```csharp
internal sealed record ProcessEngineJob : ProcessEngineItem
{
    public required ProcessEngineActor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required IReadOnlyList<ProcessEngineTask> Tasks { get; init; }

    /// <summary>
    /// The BPMN element this job moved the instance to.
    /// Used to populate CompletedElementId in the OnJobComplete callback.
    /// Updated when new tasks are appended (to track the latest target element).
    /// </summary>
    public string? DesiredElementId { get; set; }

    public static ProcessEngineJob FromRequest(ProcessEngineJobRequest jobRequest) =>
        new()
        {
            Key = jobRequest.Key,
            InstanceInformation = jobRequest.InstanceInformation,
            Actor = jobRequest.Actor,
            DesiredElementId = jobRequest.DesiredElementId,
            Tasks = jobRequest
                .Commands.Select((cmd, i) => ProcessEngineTask.FromRequest(jobRequest.Key, cmd, jobRequest.Actor, i))
                .ToList(),
        };

    // ...
}
```

Add method to append tasks:

```csharp
/// <summary>
/// Appends additional tasks to this job.
/// </summary>
/// <param name="taskRequests">The task requests to append.</param>
/// <param name="newDesiredElementId">The new target element (if continuing to a new task).</param>
/// <returns>The newly created tasks (for persistence).</returns>
public IReadOnlyList<ProcessEngineTask> AppendTasks(
    IEnumerable<ProcessEngineCommandRequest> taskRequests,
    string? newDesiredElementId = null)
{
    // Update the target element if provided (for the next OnJobComplete callback)
    if (newDesiredElementId is not null)
    {
        DesiredElementId = newDesiredElementId;
    }

    int nextOrder = Tasks.Count > 0 ? Tasks.Max(t => t.ProcessingOrder) + 1 : 0;
    var newTasks = new List<ProcessEngineTask>();

    foreach (var request in taskRequests)
    {
        var task = new ProcessEngineTask
        {
            Key = $"{Key}/task-{nextOrder}",
            ProcessingOrder = nextOrder++,
            Command = request.Command,
            Actor = Actor,
            RetryStrategy = request.RetryStrategy,
            Status = ProcessEngineItemStatus.Enqueued,
        };
        Tasks.Add(task);
        newTasks.Add(task);
    }

    return newTasks;
}
```

### Phase 4: Task Handler Update

**File:** `src/Altinn.App.ProcessEngine/ProcessEngineTaskHandler.cs`

Add to interface `IProcessEngineTaskHandler`:

```csharp
Task<OnJobCompleteResponse> CallOnJobComplete(
    ProcessEngineJob job,
    string completedElementId,
    CancellationToken cancellationToken);
```

Add implementation to `ProcessEngineTaskHandler`:

```csharp
public async Task<OnJobCompleteResponse> CallOnJobComplete(
    ProcessEngineJob job,
    string completedElementId,
    CancellationToken cancellationToken)
{
    _logger.LogDebug("Calling OnJobComplete for job {JobKey}", job.Key);

    // Note: This throws on failure so the workflow engine will retry the callback.
    // The app's handler is idempotent (checks CompletedElementId), so retries are safe.
    using var httpClient = GetAuthorizedAppClient(job.InstanceInformation);

    var request = new OnJobCompleteRequest
    {
        InstanceInformation = job.InstanceInformation,
        Actor = job.Actor,
        CompletedElementId = completedElementId,
    };

    using var response = await httpClient.PostAsJsonAsync(
        "on-job-complete",
        request,
        cancellationToken);

    if (!response.IsSuccessStatusCode)
    {
        _logger.LogWarning(
            "OnJobComplete callback failed with status {StatusCode} for job {JobKey}",
            response.StatusCode,
            job.Key);
        throw new ProcessEngineCallbackException(
            $"OnJobComplete callback failed with status {response.StatusCode}");
    }

    var result = await response.Content.ReadFromJsonAsync<OnJobCompleteResponse>(cancellationToken);
    return result ?? new OnJobCompleteResponse();
}
```

### Phase 5: ProcessEngine Update

**File:** `src/Altinn.App.ProcessEngine/ProcessEngine.cs`

Modify `ProcessJob` method. After the existing "Job is done" check, add completion callback logic:

```csharp
private async Task ProcessJob(ProcessEngineJob job, CancellationToken cancellationToken)
{
    _logger.LogDebug("Processing job: {Job}", job);

    switch (job.DatabaseUpdateStatus())
    {
        // ... existing cases ...

        case ProcessEngineTaskStatus.Finished:
            _logger.LogDebug("Job {Job} database operation has completed. Cleaning up", job);
            job.CleanupDatabaseTask();
            break;

        default:
            throw new ProcessEngineException($"Unknown database update status: {job.DatabaseUpdateStatus()}");
    }

    // Job still has work pending (requeued tasks, etc)
    if (!job.IsDone())
    {
        _logger.LogDebug("Job {Job} still has tasks processing. Leaving in queue for next iteration", job);
        return;
    }

    // All tasks complete - ask app if there's more to do
    // The callback throws on failure, leaving the job in queue to retry next iteration
    if (job.DesiredElementId is null)
    {
        _logger.LogDebug("Job {JobKey} has no DesiredElementId, skipping completion callback", job.Key);
    }
    else
    {
        OnJobCompleteResponse response = await _taskHandler.CallOnJobComplete(
            job,
            job.DesiredElementId,
            cancellationToken);

        if (response.AdditionalTasks.Count > 0)
        {
            _logger.LogDebug(
                "OnJobComplete returned {TaskCount} additional tasks for job {JobKey}",
                response.AdditionalTasks.Count,
                job.Key);

            // Append tasks to job (also updates DesiredElementId for next callback)
            var newTasks = job.AppendTasks(response.AdditionalTasks, response.DesiredElementId);

            // Persist new tasks to database
            var persistedTasks = await _repository.AddTasksToJob(job.DatabaseId, newTasks, cancellationToken);

            // Update in-memory tasks with database IDs
            for (int i = 0; i < newTasks.Count && i < persistedTasks.Count; i++)
            {
                newTasks[i].DatabaseId = persistedTasks[i].DatabaseId;
            }

            job.Status = ProcessEngineItemStatus.Processing;
            // Don't remove from queue - will be processed in next iteration
            return;
        }
    }

    // Truly done - remove from queue
    RemoveJobAndReleaseQueueSlot(job);
    _logger.LogDebug("Job {Job} is done", job);
}
```

### Phase 6: Expose State Change Generation in ProcessEngine

The existing `ProcessEngine.MoveProcessStateToNextAndGenerateEvents` method contains the logic we need. We'll expose this through the `IProcessEngine` interface so `OnJobCompleteHandler` can reuse it.

**File:** `src/Altinn.App.Core/Internal/Process/Interfaces/IProcessEngine.cs`

Add new method:

```csharp
/// <summary>
/// Generates a process state change for moving to the next element without dispatching to the workflow engine.
/// Used by OnJobCompleteHandler to generate continuation commands.
/// </summary>
/// <param name="instance">The instance to generate state change for.</param>
/// <param name="action">Optional action (e.g., "reject").</param>
/// <returns>The state change, or null if the process cannot advance.</returns>
Task<ProcessStateChange?> GenerateNextStateChange(Instance instance, string? action = null);
```

**File:** `src/Altinn.App.Core/Internal/Process/ProcessEngine.cs`

Make the existing method accessible via the interface. The existing `MoveProcessStateToNextAndGenerateEvents` is already doing what we need - just expose it:

```csharp
/// <inheritdoc/>
public Task<ProcessStateChange?> GenerateNextStateChange(Instance instance, string? action = null)
{
    return MoveProcessStateToNextAndGenerateEvents(instance, action);
}
```

### Phase 7: App Handler

**File:** `src/Altinn.App.Core/Internal/ProcessEngine/IOnJobCompleteHandler.cs` (new)

```csharp
using Altinn.App.Core.Models;
using Altinn.App.ProcessEngine.Models;

namespace Altinn.App.Core.Internal.ProcessEngine;

/// <summary>
/// Handles the OnJobComplete callback from the workflow engine.
/// Determines if additional tasks should be appended to continue the process.
/// </summary>
internal interface IOnJobCompleteHandler
{
    Task<OnJobCompleteResponse> Handle(
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        OnJobCompleteRequest request,
        CancellationToken cancellationToken);
}
```

**File:** `src/Altinn.App.Core/Internal/ProcessEngine/OnJobCompleteHandler.cs` (new)

```csharp
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.ProcessEngine.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.ProcessEngine;

internal sealed class OnJobCompleteHandler : IOnJobCompleteHandler
{
    private readonly IInstanceClient _instanceClient;
    private readonly IProcessEngine _processEngine;
    private readonly ProcessNextRequestFactory _processNextRequestFactory;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<OnJobCompleteHandler> _logger;

    public OnJobCompleteHandler(
        IInstanceClient instanceClient,
        IProcessEngine processEngine,
        ProcessNextRequestFactory processNextRequestFactory,
        AppImplementationFactory appImplementationFactory,
        ILogger<OnJobCompleteHandler> logger)
    {
        _instanceClient = instanceClient;
        _processEngine = processEngine;
        _processNextRequestFactory = processNextRequestFactory;
        _appImplementationFactory = appImplementationFactory;
        _logger = logger;
    }

    public async Task<OnJobCompleteResponse> Handle(
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        OnJobCompleteRequest request,
        CancellationToken cancellationToken)
    {
        // Get current instance state
        Instance instance = await _instanceClient.GetInstance(
            appId.App,
            appId.Org,
            instanceId.InstanceOwnerPartyId,
            instanceId.InstanceGuid,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken);

        // Idempotency check: if the current element doesn't match the completed element,
        // this is a duplicate callback (process already advanced). Return empty response.
        string? currentElementId = instance.Process?.CurrentTask?.ElementId;
        if (currentElementId != request.CompletedElementId)
        {
            _logger.LogDebug(
                "Duplicate callback detected: current element {CurrentElementId} != completed element {CompletedElementId}",
                currentElementId,
                request.CompletedElementId);
            return new OnJobCompleteResponse();
        }

        // Process ended? Nothing more to do.
        if (instance.Process?.Ended is not null)
        {
            _logger.LogDebug("Process has ended, no continuation needed");
            return new OnJobCompleteResponse();
        }

        // Current task is a service task? Continue the process.
        string? currentTaskType = instance.Process?.CurrentTask?.AltinnTaskType;
        if (!IsServiceTask(currentTaskType))
        {
            _logger.LogDebug(
                "Current task type {TaskType} is not a service task, no continuation needed",
                currentTaskType);
            return new OnJobCompleteResponse();
        }

        _logger.LogDebug(
            "Service task {CurrentTask} completed, generating continuation",
            instance.Process?.CurrentTask?.ElementId);

        // Reuse ProcessEngine's existing logic to generate the state change
        ProcessStateChange? stateChange = await _processEngine.GenerateNextStateChange(instance, action: null);

        if (stateChange is null)
        {
            _logger.LogWarning("ProcessEngine returned null state change");
            return new OnJobCompleteResponse();
        }

        // Create commands for the transition
        ProcessNextRequest nextRequest = await _processNextRequestFactory.Create(stateChange);

        return new OnJobCompleteResponse
        {
            AdditionalTasks = nextRequest.Tasks.ToList(),
            DesiredElementId = nextRequest.DesiredElementId,
        };
    }

    private bool IsServiceTask(string? taskType)
    {
        if (taskType is null)
            return false;

        return _appImplementationFactory
            .GetAll<IServiceTask>()
            .Any(st => st.Type.Equals(taskType, StringComparison.OrdinalIgnoreCase));
    }
}
```

**File:** `src/Altinn.App.Core/Extensions/ServiceCollectionExtensions.cs`

Add registration (find the appropriate location in the existing registrations):

```csharp
services.AddScoped<IOnJobCompleteHandler, OnJobCompleteHandler>();
```

### Phase 8: Controller Endpoint

**File:** `src/Altinn.App.Api/Controllers/ProcessEngineCallbackController.cs`

Add new endpoint:

```csharp
/// <summary>
/// Called by workflow engine when all tasks in a job complete.
/// Returns additional tasks if the process should continue (e.g., after service task).
/// </summary>
[HttpPost("on-job-complete")]
public async Task<ActionResult<OnJobCompleteResponse>> OnJobComplete(
    [FromRoute] string org,
    [FromRoute] string app,
    [FromRoute] int instanceOwnerPartyId,
    [FromRoute] Guid instanceGuid,
    [FromBody] OnJobCompleteRequest request,
    CancellationToken cancellationToken)
{
    using Activity? activity = _telemetry?.StartProcessEngineCallbackActivity(instanceGuid, "on-job-complete");

    var appId = new AppIdentifier(org, app);
    var instanceId = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);

    var handler = _serviceProvider.GetRequiredService<IOnJobCompleteHandler>();

    OnJobCompleteResponse response = await handler.Handle(
        appId,
        instanceId,
        request,
        cancellationToken);

    _logger.LogDebug(
        "OnJobComplete for instance {InstanceId} returned {TaskCount} additional tasks",
        instanceId,
        response.AdditionalTasks.Count);

    return Ok(response);
}
```

### Phase 9: Test Infrastructure Update

**File:** `test/Altinn.App.Api.Tests/InProcessProcessEngineClient.cs`

The `InProcessProcessEngineClient` is a test-only implementation of `IProcessEngineClient` that executes commands synchronously in-process instead of via HTTP to the real workflow engine. It currently has a temporary auto-continue implementation that calls `ProcessEngine.Next()` directly after service tasks. This should be updated to use `OnJobCompleteHandler` for consistency with production code.

Update `ProcessNext` to use the completion callback handler:

```csharp
public async Task ProcessNext(
    Instance instance,
    EngineProcessNextRequest request,
    CancellationToken cancellationToken = default)
{
    var appId = new AppIdentifier(instance.Org, instance.AppId.Split('/')[1]);
    var instanceId = new InstanceIdentifier(instance);

    // Fetch the instance fresh from storage
    Instance currentInstance = await _instanceClient.GetInstance(
        appId.App,
        appId.Org,
        instanceId.InstanceOwnerPartyId,
        instanceId.InstanceGuid,
        StorageAuthenticationMethod.ServiceOwner(),
        cancellationToken);

    // Execute commands with completion callback loop
    var tasksToExecute = request.Tasks.ToList();
    var currentDesiredElementId = request.DesiredElementId;

    while (true)
    {
        // Initialize unit of work for this batch
        InstanceDataUnitOfWork instanceDataUnitOfWork = await _instanceDataUnitOfWorkInitializer.Init(
            currentInstance,
            request.CurrentElementId,
            request.Actor.Language,
            StorageAuthenticationMethod.ServiceOwner());

        // Execute all commands
        foreach (var taskRequest in tasksToExecute)
        {
            if (taskRequest.Command is ProcessEngineCommand.AppCommand appCommand)
            {
                if (IsAltinnEventCommand(appCommand.CommandKey))
                    continue;

                await ExecuteAppCommand(
                    appId,
                    instanceId,
                    appCommand,
                    request.Actor,
                    instanceDataUnitOfWork,
                    cancellationToken);
            }
        }

        // Save changes
        DataElementChanges changes = instanceDataUnitOfWork.GetDataElementChanges(false);
        await instanceDataUnitOfWork.UpdateInstanceData(changes);
        await instanceDataUnitOfWork.SaveChanges(changes);

        // Persist the process state
        await _instanceClient.UpdateProcess(
            instanceDataUnitOfWork.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken);

        // Update the caller's instance reference
        instance.Data.Clear();
        instance.Data.AddRange(instanceDataUnitOfWork.Instance.Data);
        instance.Process = instanceDataUnitOfWork.Instance.Process;
        currentInstance = instanceDataUnitOfWork.Instance;

        // Call completion handler to check for continuation
        // completedElementId is the element we just moved to (DesiredElementId from the request)
        var handler = _serviceProvider.GetRequiredService<IOnJobCompleteHandler>();
        var onJobCompleteRequest = new OnJobCompleteRequest
        {
            InstanceInformation = new InstanceInformation
            {
                Org = appId.Org,
                App = appId.App,
                InstanceOwnerPartyId = instanceId.InstanceOwnerPartyId,
                InstanceGuid = instanceId.InstanceGuid,
            },
            Actor = request.Actor,
            CompletedElementId = currentDesiredElementId,
        };

        OnJobCompleteResponse response = await handler.Handle(
            appId,
            instanceId,
            onJobCompleteRequest,
            cancellationToken);

        if (response.AdditionalTasks.Count == 0)
            break;

        // Prepare for next iteration - use the new target element
        tasksToExecute = response.AdditionalTasks.ToList();
        currentDesiredElementId = response.DesiredElementId ?? currentDesiredElementId;
    }
}
```

---

## Summary of Changes

### New Files
| File | Purpose |
|------|---------|
| `src/Altinn.App.ProcessEngine/Models/OnJobCompleteRequest.cs` | Request DTO for completion callback |
| `src/Altinn.App.ProcessEngine/Models/OnJobCompleteResponse.cs` | Response DTO with additional tasks |
| `src/Altinn.App.Core/Internal/ProcessEngine/IOnJobCompleteHandler.cs` | Interface for completion handler |
| `src/Altinn.App.Core/Internal/ProcessEngine/OnJobCompleteHandler.cs` | Implementation - checks task type, generates continuation |

### Modified Files
| File | Change |
|------|--------|
| `src/Altinn.App.ProcessEngine/ProcessEngine.cs` | Call completion callback after job tasks complete |
| `src/Altinn.App.ProcessEngine/ProcessEngineTaskHandler.cs` | Add `CallOnJobComplete` method |
| `src/Altinn.App.ProcessEngine/Models/ProcessEngineJob.cs` | Add `DesiredElementId` property and `AppendTasks` method |
| `src/Altinn.App.ProcessEngine/Models/ProcessEngineJobRequest.cs` | Add `DesiredElementId` parameter |
| `src/Altinn.App.ProcessEngine/Models/ProcessNextRequest.cs` | Pass `DesiredElementId` to job request |
| `src/Altinn.App.ProcessEngine/Data/IProcessEngineRepository.cs` | Add `AddTasksToJob` method |
| `src/Altinn.App.ProcessEngine/Data/ProcessEnginePgRepository.cs` | Implement `AddTasksToJob` |
| `src/Altinn.App.ProcessEngine/Data/ProcessEngineInMemoryRepository.cs` | Implement `AddTasksToJob` |
| `src/Altinn.App.Core/Internal/Process/Interfaces/IProcessEngine.cs` | Add `GenerateNextStateChange` method |
| `src/Altinn.App.Core/Internal/Process/ProcessEngine.cs` | Implement `GenerateNextStateChange` (exposes existing logic) |
| `src/Altinn.App.Api/Controllers/ProcessEngineCallbackController.cs` | Add `on-job-complete` endpoint |
| `src/Altinn.App.Core/Extensions/ServiceCollectionExtensions.cs` | Register `IOnJobCompleteHandler` |
| `test/Altinn.App.Api.Tests/InProcessProcessEngineClient.cs` | Use completion callback pattern |

---

## Future Work: Event Inbox

**Not included in this PR.** The event inbox pattern (queueing events as jobs) can be implemented as a follow-up:

1. Modify `EventsReceiverController` to queue events as jobs instead of processing immediately
2. Create a `ProcessEvent` command that processes the queued event
3. Events will naturally wait for running jobs to complete (instance lock)

For now, the existing 425 retry pattern handles the race condition.

---

## Existing Tests to Verify

These tests in `test/Altinn.App.Api.Tests/Process/ServiceTasks/` verify service task auto-continuation:

- `PdfServiceTaskTests.Can_Execute_PdfServiceTask_And_Move_To_Next_Task` - PDF task completes, process ends
- `PdfServiceTaskTests.CurrentTask_Is_ServiceTask_If_Execute_Fails` - Failed service task stays on current task
- `EFormidlingServiceTaskTests.Can_Execute_EFormidlingServiceTask_And_Move_To_Next_Task` - eFormidling completes, process ends

These tests use the `InProcessProcessEngineClient` and should continue to pass after the refactoring.

---

## Design Decision: Idempotency and Retry

**Resolved.** The completion callback SHOULD retry if the app doesn't respond, and the app MUST handle duplicate callbacks idempotently.

**Idempotency mechanism:**
1. `OnJobCompleteRequest` includes `CompletedElementId` - the BPMN element that was current when the job completed
2. The app's `OnJobCompleteHandler` checks if the instance's current element matches - if not, the process already advanced (duplicate callback) and returns empty response
3. The workflow engine deduplicates tasks by key when appending - if a task with the same key already exists in the job, it's skipped

**Retry mechanism:**
- If the callback fails (HTTP error or exception), the workflow engine should retry with exponential backoff
- After max retries, mark the job as failed (the instance stays at the service task, user can retry manually)
