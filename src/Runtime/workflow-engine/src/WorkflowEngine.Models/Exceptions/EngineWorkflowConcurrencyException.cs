namespace WorkflowEngine.Models.Exceptions;

// CA1032: Implement standard exception constructors
#pragma warning disable CA1032

public sealed class EngineWorkflowConcurrencyException(
    WorkflowType workflowType,
    string rejectionReason,
    long blockingWorkflowId
) : EngineException(FormatMessage(workflowType, rejectionReason, blockingWorkflowId))
{
    public WorkflowType WorkflowType { get; } = workflowType;
    public string RejectionReason { get; } = rejectionReason;
    public long BlockingWorkflowId { get; } = blockingWorkflowId;

    private static string FormatMessage(WorkflowType type, string rejectionReason, long blockingWorkflowId) =>
        rejectionReason switch
        {
            "slot_full" => $"Cannot enqueue workflow of type '{type}': the active chain already has both a processing "
                + $"and a pending workflow (blocked by workflow {blockingWorkflowId}).",
            "pending_exists" => $"Cannot enqueue workflow of type '{type}': workflow {blockingWorkflowId} is already "
                + "pending and must begin processing before another can be queued.",
            "disconnected" => $"Cannot enqueue workflow of type '{type}': workflow {blockingWorkflowId} is currently "
                + "processing and the new workflow's dependency chain does not connect to it.",
            _ => $"Cannot enqueue workflow of type '{type}': rejected by active workflow constraint "
                + $"(reason: {rejectionReason}, blocking workflow: {blockingWorkflowId}).",
        };
}
