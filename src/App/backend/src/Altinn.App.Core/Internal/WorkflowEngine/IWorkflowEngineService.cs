using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal interface IWorkflowEngineService
{
    Task<ProcessNextWorkflowResult> EnqueueAndWaitForProcessNext(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        ProcessStateChange processStateChange,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        bool takeOverProcessingStatus = false,
        CancellationToken ct = default
    );

    Task<CurrentTaskWorkflowState> GetCurrentTaskWorkflowState(Instance instance, CancellationToken ct = default);

    /// <summary>
    /// Resolves the live status of the current task's transition for read-path enrichment:
    /// whether a workflow is idle, processing (executing / auto-retrying) or failed, together with
    /// the task the transition targets and — for the failed case — the failure detail. Unlike
    /// <see cref="GetCurrentTaskWorkflowState"/> (which the process engine uses for control flow),
    /// this is a presentation projection and carries no engine ids.
    /// </summary>
    Task<WorkflowTaskStatus> ResolveWorkflowTaskStatus(Instance instance, CancellationToken ct = default);

    /// <summary>
    /// Writes off an unsuccessful terminal workflow (Failed -> Abandoned in the engine) so that a
    /// subsequently enqueued workflow can depend on it and run. Returns <see langword="false"/> when
    /// the engine's compare-and-set rejected the transition - e.g. a concurrent resume revived the
    /// workflow - in which case the caller must treat the task as still blocked.
    /// Side effects need no special handling here: the side-effects workflow is enqueued by the
    /// EnqueueSideEffectsWorkflow step at the commit boundary, so an abandoned pre-commit failure
    /// never scheduled any, and a committed transition's side effects run independently of the
    /// abandoned Main.
    /// </summary>
    Task<bool> AbandonWorkflow(Guid workflowId, CancellationToken ct = default);

    Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        string collectionKey,
        CancellationToken ct = default
    );

    /// <summary>
    /// Enqueues a process-next workflow that depends on another. <c>idempotencyKey</c> defaults to
    /// one derived from <c>dependsOnWorkflowId</c>; a caller that must key on something narrower —
    /// the mailbox relay keys on the step that concluded the exchange — supplies its own.
    /// </summary>
    Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey = null,
        CancellationToken ct = default
    );
}
