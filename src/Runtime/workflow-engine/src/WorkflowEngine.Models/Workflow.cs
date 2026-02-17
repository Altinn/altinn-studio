namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public DateTimeOffset? StartAt { get; init; }
    public required IReadOnlyList<Step> Steps { get; init; }
    public WorkflowType Type { get; init; }
    public long? ParentWorkflowId { get; init; }
    public WorkflowStartMode StartMode { get; init; }

    internal Task? DatabaseTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(EngineRequest engineRequest) =>
        new()
        {
            IdempotencyKey = engineRequest.IdempotencyKey,
            InstanceLockKey = engineRequest.InstanceLockKey,
            InstanceInformation = engineRequest.InstanceInformation,
            Actor = engineRequest.Actor,
            CreatedAt = engineRequest.CreatedAt,
            StartAt = engineRequest.StartAt,
            DistributedTraceContext = engineRequest.TraceContext,
            OperationId = engineRequest.OperationId,
            Type = engineRequest.Type,
            ParentWorkflowId = engineRequest.ParentWorkflowId,
            StartMode = engineRequest.StartMode,
            Steps = engineRequest
                .Steps.Select((step, i) => Step.FromRequest(engineRequest, step, engineRequest.CreatedAt, i))
                .ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {IdempotencyKey} ({Status})";

    public override int GetHashCode() => IdempotencyKey.GetHashCode(StringComparison.InvariantCulture);

    public bool Equals(Workflow? other) =>
        other?.IdempotencyKey.Equals(IdempotencyKey, StringComparison.OrdinalIgnoreCase) is true;
};
