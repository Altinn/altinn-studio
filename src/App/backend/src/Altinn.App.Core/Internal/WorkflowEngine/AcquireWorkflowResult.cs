using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// How the acquire workflow of a transition the app starts ended, as
/// <see cref="IWorkflowEngineService.EnqueueAndWaitForAcquire"/> reports it.
/// </summary>
internal abstract record AcquireWorkflowResult
{
    private AcquireWorkflowResult() { }

    /// <summary>
    /// The acquire workflow completed, either starting the transition or losing to a change made after the instance
    /// was read. <paramref name="Instance"/> is the instance as Storage has it afterwards, read as the service owner.
    /// </summary>
    internal sealed record Completed(InstanceWithStorageMetadata Instance) : AcquireWorkflowResult;

    /// <summary>
    /// The acquire workflow failed, so the transition did not start, or it had not finished by the deadline, which
    /// <paramref name="Failure"/> reports as a <see cref="WorkflowFailureKind.Timeout"/>.
    /// </summary>
    internal sealed record NotCompleted(WorkflowFailure Failure) : AcquireWorkflowResult;
}
