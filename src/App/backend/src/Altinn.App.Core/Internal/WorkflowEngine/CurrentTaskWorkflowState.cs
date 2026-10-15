namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The workflow engine's view of the instance's current task, as a closed set of states.
/// Consumers pattern-match on the concrete type; the blocked states carry the ids they
/// guarantee, so no caller has to null-check correlated optional fields.
/// </summary>
internal abstract record CurrentTaskWorkflowState
{
    private CurrentTaskWorkflowState() { }

    /// <summary>No workflow is blocking the current task.</summary>
    internal sealed record Unblocked : CurrentTaskWorkflowState;

    /// <summary>
    /// The newest workflow for the current task is still executing (enqueued, processing or
    /// requeued) - process actions must wait for it to finish.
    /// </summary>
    internal sealed record Retrying(Guid WorkflowId, string CollectionKey) : CurrentTaskWorkflowState;

    /// <summary>
    /// The newest workflow for the current task failed terminally - the process cannot continue
    /// until the workflow is resumed, or written off (-> Abandoned) by a bpmn-allowed reject.
    /// </summary>
    internal sealed record ResumeRequired(Guid WorkflowId, string CollectionKey) : CurrentTaskWorkflowState;
}
