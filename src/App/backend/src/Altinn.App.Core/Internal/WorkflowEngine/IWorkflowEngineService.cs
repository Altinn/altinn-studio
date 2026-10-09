using Altinn.App.Core.Internal.Process.Elements.Base;
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
        string? action,
        ProcessElement nextElement,
        string? language,
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
}
