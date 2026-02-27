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
    public string? InitialState { get; init; }

    internal Task? DatabaseTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        IEnumerable<Workflow>? dependencies,
        IEnumerable<Workflow>? links
    ) =>
        new()
        {
            InstanceLockKey = metadata.InstanceLockKey,
            InstanceInformation = metadata.InstanceInformation,
            Actor = metadata.Actor,
            CreatedAt = metadata.CreatedAt,
            StartAt = request.StartAt,
            DistributedTraceContext = metadata.TraceContext,
            OperationId = request.OperationId,
            Type = request.Type,
            Dependencies = dependencies,
            Links = links,
            Steps = request.Steps.Select((step, i) => Step.FromRequest(step, metadata, i)).ToList(),
            InitialState = engineRequest.State,
        };

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
};
