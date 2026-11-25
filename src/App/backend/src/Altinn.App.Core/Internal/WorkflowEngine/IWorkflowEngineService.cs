using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal interface IWorkflowEngineService
{
    /// <summary>
    /// Enqueues the workflow that starts the process of a new instance and waits for it to settle.
    /// Callbacks inherit <paramref name="language"/>; null uses the caller's profile language.
    /// </summary>
    Task<ProcessNextWorkflowResult> EnqueueAndWaitForInitialProcessState(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        ProcessStateChange processStateChange,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues the acquire workflow and waits for its dependent transition to settle.
    /// Callbacks inherit <paramref name="language"/>; null uses the caller's profile language.
    /// </summary>
    Task<ProcessNextWorkflowResult> EnqueueAndWaitForProcessNext(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        string state,
        ProcessStateChange processStateChange,
        string? language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues the acquire workflow for a transition the app itself starts, run as <paramref name="actor"/>, and waits
    /// for that workflow to end, as long as process/next waits, but not for the transition it starts.
    /// </summary>
    /// <remarks>
    /// The idempotency key is the one process/next uses for <paramref name="instanceVersions"/>, so a call on the same
    /// snapshot as a user's process/next joins its workflow when it prepares the same transition, and is rejected with
    /// 409 when it does not. A superseded acquire completes too, so the caller tells the two apart from the instance.
    /// </remarks>
    Task<AcquireWorkflowResult> EnqueueAndWaitForAcquire(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        string state,
        ProcessStateChange processStateChange,
        Actor actor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues the acquire workflow for the action pipeline <paramref name="pipelineId"/> on the current task, run as
    /// <paramref name="actor"/>, and waits until the pipeline opens, moves the process or ends.
    /// </summary>
    /// <remarks>
    /// The idempotency key is the one process/next uses for <paramref name="instanceVersions"/>, so a repeated call
    /// joins the first, and a process/next from the same version is rejected with 409.
    /// </remarks>
    Task<ProcessNextWorkflowResult> EnqueueAndWaitForActionPipeline(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        string state,
        PipelineId pipelineId,
        Actor actor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The first active workflow in the instance's collection, which holds the instance now, or null when none runs.
    /// </summary>
    Task<Guid?> FindActiveWorkflow(Instance instance, CancellationToken cancellationToken = default);

    /// <summary>
    /// Waits, from the workflow <paramref name="sinceWorkflowId"/> on, until the action pipeline has handled the
    /// message at <paramref name="position"/> in <paramref name="mailboxId"/>, or has ended.
    /// </summary>
    Task<ProcessNextWorkflowResult> WaitForActionPipelineMessage(
        Instance instance,
        Guid sinceWorkflowId,
        Guid mailboxId,
        long position,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Returns the current task's transition status, destination, and failure for reads and process/resume.
    /// </summary>
    Task<WorkflowTaskStatus> ResolveWorkflowTaskStatus(
        Instance instance,
        CancellationToken cancellationToken = default
    );

    Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues a dependent transition, keyed by its parent workflow unless <paramref name="idempotencyKey"/>
    /// is supplied. Mailbox continuations use the concluding step's key.
    /// </summary>
    Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues an action pipeline's first workflow inside the acquire that holds the instance for it, keyed by that
    /// acquire workflow.
    /// </summary>
    Task EnqueueDependentActionPipeline(
        Instance instance,
        PipelineId pipelineId,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Enqueues the workflow that returns the instance to idle on its task at the end of an action pipeline.
    /// </summary>
    Task EnqueueRelease(
        Instance instance,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );
}
