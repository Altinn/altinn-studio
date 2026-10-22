using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Storage;
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
    /// <paramref name="language"/> is the language the instance was created with, for the workflow's callbacks.
    /// </summary>
    Task<Instance> SubmitInitialProcessState(
        Instance instance,
        StorageVersionMetadata versions,
        ProcessStateChange processStateChange,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method to move process to next task/event
    /// </summary>
    Task<ProcessChangeResult> Next(ProcessNextRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves the process on for the app itself, from code that has already decided that the transition is due, and
    /// returns once the transition has started, without waiting for it to finish.
    /// </summary>
    /// <remarks>
    /// Runs what <see cref="Next"/> runs before the transition, such as the process status check, validation and the
    /// gateways, but as the app rather than a caller: there is no policy check and no user action, data is read as the
    /// service owner, and the workflow runs as <paramref name="actor"/>, in its language. Must never be reachable with
    /// input a caller controls. Like <see cref="Next"/>, it answers <see cref="ProcessNextState.InstanceChanged"/> when
    /// the instance changed after <paramref name="instanceVersions"/> was read, so the transition did not start, with
    /// the instance as it is now. It answers a workflow failure when the workflow engine failed to start the transition,
    /// and a <see cref="WorkflowFailureKind.Timeout"/> failure when it has not finished starting it in the time
    /// <see cref="Next"/> waits. Like <see cref="Next"/>, it throws when another call has enqueued a different
    /// transition from the same version.
    /// </remarks>
    Task<ProcessChangeResult> EnqueueNextForApp(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        string action,
        Actor actor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Attempts to resume the workflow that established the instance's current task.
    /// </summary>
    Task<ProcessChangeResult> ResumeCurrentTask(
        ProcessNextRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues a process-next workflow that transitions the process from the current task to the next element.
    /// The workflow has a dependency on <paramref name="dependsOnWorkflowId"/> so it won't start
    /// until that workflow completes.
    /// Does not mutate the instance the <paramref name="dataAccessor"/> exposes.
    /// </summary>
    /// <remarks>
    /// <c>idempotencyKey</c> defaults to one derived from <c>dependsOnWorkflowId</c>; the mailbox
    /// relay passes its own, derived from the step that concluded the exchange, so every call it
    /// makes from inside one callback keys off the same executing step.
    /// The callback's <c>executionReferenceTime</c> supplies event and process timestamps so retries
    /// reconstruct the same logical transition.
    /// </remarks>
    Task EnqueueProcessNext(
        IInstanceDataAccessor dataAccessor,
        Actor actor,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        DateTimeOffset executionReferenceTime,
        string? action = null,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default
    );
}
