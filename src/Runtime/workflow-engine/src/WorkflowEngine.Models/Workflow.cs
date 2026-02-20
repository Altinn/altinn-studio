namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public DateTimeOffset? StartAt { get; init; }
    public required IReadOnlyList<Step> Steps { get; init; }
    public WorkflowType Type { get; init; }
    public string? DistributedTraceContext { get; set; }
    public IEnumerable<Workflow>? Dependencies { get; init; }
    public IEnumerable<Workflow>? Links { get; init; }

    internal Task? DatabaseTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(
        WorkflowEnqueueRequest workflowEnqueueRequest,
        IEnumerable<Workflow>? dependencies
    ) =>
        new()
        {
            InstanceLockKey = workflowEnqueueRequest.InstanceLockKey,
            InstanceInformation = workflowEnqueueRequest.InstanceInformation,
            Actor = workflowEnqueueRequest.Actor,
            CreatedAt = workflowEnqueueRequest.CreatedAt,
            StartAt = workflowEnqueueRequest.StartAt,
            DistributedTraceContext = workflowEnqueueRequest.TraceContext,
            OperationId = workflowEnqueueRequest.OperationId,
            Type = workflowEnqueueRequest.Type,
            Dependencies = dependencies,
            Steps = workflowEnqueueRequest
                .Steps.Select(
                    (step, i) => Step.FromRequest(workflowEnqueueRequest, step, workflowEnqueueRequest.CreatedAt, i)
                )
                .ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
};
