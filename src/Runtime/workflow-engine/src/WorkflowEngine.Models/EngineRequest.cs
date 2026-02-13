namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue one or more task in the process engine.
/// </summary>
/// <param name="IdempotencyKey">The job identifier. A unique keyword describing the job.</param>
/// <param name="OperationId">An identifier for this operation (eg. 'next').</param>
/// <param name="InstanceInformation">Information about the instance this job relates to.</param>
/// <param name="Actor">The actor this request is executed on behalf of.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="StartAt">An optional start time for when the workflow should be executed.</param>
/// <param name="Steps">The individual steps comprising this job.</param>
/// <param name="TraceContext">The trace context for distributed tracing.</param>
/// <param name="InstanceLockKey">The lock key for the instance.</param>
public record EngineRequest(
    string IdempotencyKey,
    string OperationId,
    InstanceInformation InstanceInformation,
    Actor Actor,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartAt,
    IEnumerable<StepRequest> Steps,
    string? TraceContext = null,
    string? InstanceLockKey = null
)
{
    /// <summary>
    /// Determines whether the request is valid.
    /// </summary>
    public bool IsValid() => Steps.Any();
};
