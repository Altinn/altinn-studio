using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// A single status update request waiting in the buffer.
/// </summary>
internal sealed record WorkflowUpdateRequest(
    Workflow Workflow,
    IReadOnlyList<Step> DirtySteps,
    TaskCompletionSource? Completion
);
