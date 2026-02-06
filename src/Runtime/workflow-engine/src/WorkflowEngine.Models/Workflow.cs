namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required IReadOnlyList<Step> Steps { get; init; }

    public DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(EngineRequest engineRequest) =>
        new()
        {
            IdempotencyKey = engineRequest.IdempotencyKey,
            InstanceInformation = engineRequest.InstanceInformation,
            Actor = engineRequest.Actor,
            CreatedAt = engineRequest.CreatedAt,
            TraceContext = engineRequest.TraceContext,
            OperationId = engineRequest.OperationId,
            Steps = engineRequest
                .Steps.Select((step, i) => Step.FromRequest(engineRequest, step, engineRequest.CreatedAt, i))
                .ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {IdempotencyKey} ({Status})";

    public override int GetHashCode() => IdempotencyKey.GetHashCode(StringComparison.InvariantCulture);

    public bool Equals(Workflow? other) =>
        other?.IdempotencyKey.Equals(IdempotencyKey, StringComparison.OrdinalIgnoreCase) is true;
};
