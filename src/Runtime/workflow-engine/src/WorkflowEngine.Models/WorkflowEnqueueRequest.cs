namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue a workflow for execution by the engine.
/// </summary>
/// <param name="OperationId">An identifier for this operation (eg. 'next').</param>
/// <param name="InstanceInformation">Information about the instance this workflow relates to.</param>
/// <param name="Actor">The actor this request is executed on behalf of.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="StartAt">An optional start time for when the workflow should be executed.</param>
/// <param name="Steps">The individual steps comprising this workflow.</param>
/// <param name="TraceContext">The trace context for distributed tracing.</param>
/// <param name="InstanceLockKey">The lock key for the instance.</param>
/// <param name="Metadata">Optional metadata for the request. Expects JSON string.</param>
/// <param name="Type">The type of workflow this request is for.</param>
/// <param name="Dependencies">Optional workflow IDs that must be completed before this request can be executed.</param>
public sealed record WorkflowEnqueueRequest(
    string OperationId,
    InstanceInformation InstanceInformation,
    Actor Actor,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartAt,
    IEnumerable<StepRequest> Steps,
    WorkflowType Type,
    string? TraceContext = null,
    string? InstanceLockKey = null,
    string? Metadata = null,
    IEnumerable<long>? Dependencies = null
)
{
    /// <summary>
    /// Determines whether the request is valid.
    /// </summary>
    public bool IsValid() => Steps.Any();
};
