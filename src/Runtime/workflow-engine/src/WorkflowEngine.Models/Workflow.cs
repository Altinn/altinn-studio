namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public Guid? CorrelationId { get; init; }
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required string Namespace { get; init; }
    public DateTimeOffset? StartAt { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public required IReadOnlyList<Step> Steps { get; init; }
    public string? DistributedTraceContext { get; set; }
    public IEnumerable<Workflow>? Dependencies { get; init; }
    public IEnumerable<Workflow>? Links { get; init; }
    public string? InitialState { get; init; }

    internal Task? DatabaseTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        string idempotencyKey,
        IEnumerable<Workflow>? dependencies = null,
        IEnumerable<Workflow>? links = null
    ) =>
        new()
        {
            DatabaseId = Guid.CreateVersion7(),
            IdempotencyKey = idempotencyKey,
            CorrelationId = metadata.CorrelationId,
            InstanceLockKey = metadata.InstanceLockKey,
            InstanceInformation = metadata.InstanceInformation,
            Namespace = metadata.Namespace,
            Actor = metadata.Actor,
            CreatedAt = metadata.CreatedAt,
            StartAt = request.StartAt,
            BackoffUntil = request.StartAt,
            DistributedTraceContext = metadata.TraceContext,
            OperationId = request.OperationId,
            Dependencies = dependencies,
            Links = links,
            Steps = request
                .Steps.Select((step, i) => Step.FromRequest(request, step, metadata, idempotencyKey, i))
                .ToList(),
            InitialState = request.State,
        };

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
};
