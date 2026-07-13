using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Process engine interface that defines the Altinn App process engine.
/// Naming convention: <c>Enqueue*</c> methods return as soon as the workflow engine has durably
/// accepted the workflow - they never wait for it to run. Members that wait for the workflow chain
/// to settle say so explicitly (<see cref="Next"/>, <see cref="SubmitInitialProcessState"/> and
/// <see cref="ResumeCurrentTask"/> wrap the wait internally; the service layer's waiting variant is
/// named <c>EnqueueAndWaitForProcessNext</c>).
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
    /// Enqueues a process-next workflow that transitions the process from the current task to the next element,
    /// with an explicit dependency on <paramref name="dependsOnWorkflowId"/> so it won't start until that
    /// workflow completes. Used from inside engine callbacks (auto-advance), where the lock token, state and
    /// collection key are already available. Returns once the engine has durably accepted the workflow.
    /// Does not mutate the <paramref name="instance"/>.
    /// </summary>
    Task EnqueueDependentProcessNext(
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
    /// Enqueues a process-next workflow on behalf of a system actor (e.g. an async service-task reply) and
    /// returns as soon as the engine has durably accepted it — no synchronous wait and no "current task
    /// workflow" gate. Self-contained: acquires the instance lock briefly, captures the callback state and
    /// computes the transition internally.
    /// The workflow auto-appends onto the collection's current heads, so the engine runs it immediately when
    /// the collection is idle, or chains it after the active head. Computes the transition and captures the
    /// callback state internally; does not mutate the <paramref name="instance"/>.
    /// </summary>
    /// <param name="instance">The instance to advance, freshly fetched by the caller.</param>
    /// <param name="actor">The system actor performing the advance (e.g. the service owner org).</param>
    /// <param name="action">The process action, or null for the task type's default action.</param>
    /// <param name="requiredCurrentTaskType">
    /// The altinn task type the trigger belongs to (e.g. the parked service task awaiting this reply).
    /// When set and the instance's current task is no longer of this type, the advance is skipped with a
    /// warning instead of advancing an unrelated task — this is what makes at-least-once triggers
    /// (FiksIO redelivery, Events retries) safe after the original advance has committed.
    /// </param>
    /// <param name="ct">Cancellation token.</param>
    Task EnqueueProcessNext(
        Instance instance,
        Actor actor,
        string? action = null,
        string? requiredCurrentTaskType = null,
        CancellationToken ct = default
    );
}
