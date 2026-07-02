using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Process engine interface that defines the Altinn App process engine
/// </summary>
internal interface IProcessEngine
{
    /// <summary>
    /// Generates process start events and updates the instance's process state in memory.
    /// Does not persist anything - use <see cref="SubmitInitialProcessState"/> to dispatch to the async engine.
    /// </summary>
    Task<ProcessChangeResult> CreateInitialProcessState(ProcessStartRequest request);

    /// <summary>
    /// Dispatches a process state change to the async process engine and waits for completion.
    /// </summary>
    Task<Instance> SubmitInitialProcessState(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Method to move process to next task/event
    /// </summary>
    Task<ProcessChangeResult> Next(ProcessNextRequest request, CancellationToken ct = default);

    /// <summary>
    /// Attempts to resume the workflow that established the instance's current task.
    /// </summary>
    Task<ProcessChangeResult> ResumeCurrentTask(ProcessNextRequest request, CancellationToken ct = default);

    /// <summary>
    /// Enqueues a process-next workflow that transitions the process from the current task to the next element.
    /// The workflow has a dependency on <paramref name="dependsOnWorkflowId"/> so it won't start
    /// until that workflow completes.
    /// Does not mutate the <paramref name="instance"/>.
    /// </summary>
    Task EnqueueProcessNext(
        Instance instance,
        Actor actor,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        string? action = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Enqueues a process-next workflow on behalf of a system actor (e.g. an async service-task callback) and
    /// returns as soon as the engine accepts it — no synchronous wait and no "current task workflow" gate.
    /// The workflow auto-appends onto the collection's current heads, so the engine runs it immediately when
    /// the collection is idle, or chains it after the active head. Computes the transition and captures the
    /// callback state internally; does not mutate the <paramref name="instance"/>.
    /// </summary>
    Task EnqueueProcessNextNoWait(
        Instance instance,
        Actor actor,
        string? action = null,
        CancellationToken ct = default
    );
}
