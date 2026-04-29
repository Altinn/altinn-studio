#pragma warning disable CA1032 // Standard exception constructors are intentionally omitted — this exception requires domain-specific parameters

namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown on the submitting caller's completion when a batched workflow write-back is
/// rejected because the workflow's <c>LeaseToken</c> no longer matches the row. The
/// workflow has been reclaimed by another host; the caller should stop processing and
/// must not retry — the new owner is already handling the workflow.
/// </summary>
public sealed class LeaseLostException : EngineException
{
    public Guid WorkflowId { get; }

    public LeaseLostException(Guid workflowId)
        : base($"Lease lost for workflow {workflowId} — another host has reclaimed it.")
    {
        WorkflowId = workflowId;
    }
}
