using System.Text.Json;

namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    /// <summary>
    /// Optional correlation ID shared by all workflows in a batch.
    /// Used for grouping and looking up related workflows.
    /// </summary>
    public Guid? CorrelationId { get; init; }

    /// <summary>
    /// Primary isolation boundary. Idempotency keys are unique within a namespace.
    /// Example: an instance GUID, a customer ID, a project ID — whatever the host defines.
    /// </summary>
    public required string Namespace { get; init; }

    /// <summary>
    /// Indexed key-value pairs for filtering, grouping, and dashboard queries.
    /// The engine stores and indexes these but never interprets them.
    /// Example: {"org":"ttd", "app":"test", "partyId":"12345"}
    /// </summary>
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Opaque context passed to command handlers at execution time.
    /// The engine stores but never inspects this. Handlers deserialize what they need.
    /// Example: {"lockToken":"...", "actor":{...}, "commandEndpoint":"..."}
    /// </summary>
    public JsonElement? Context { get; init; }

    public DateTimeOffset? StartAt { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public required IReadOnlyList<Step> Steps { get; init; }
    public string? DistributedTraceContext { get; set; }
    public IEnumerable<Workflow>? Dependencies { get; init; }
    public IEnumerable<Workflow>? Links { get; init; }
    public string? InitialState { get; init; }

    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    /// <summary>
    /// Creates a domain <see cref="Workflow"/> from a <see cref="WorkflowRequest"/>,
    /// server-computed <see cref="WorkflowRequestMetadata"/>, and shared enqueue-level fields.
    /// </summary>
    internal static Workflow FromRequest(
        WorkflowRequest workflowRequest,
        WorkflowRequestMetadata metadata,
        WorkflowEnqueueRequest enqueueRequest
    )
    {
        var idempotencyKey = enqueueRequest.IdempotencyKey;
        int order = 0;

        return new Workflow
        {
            DatabaseId = Guid.CreateVersion7(),
            CorrelationId = metadata.CorrelationId ?? enqueueRequest.CorrelationId,
            OperationId = workflowRequest.OperationId,
            IdempotencyKey = idempotencyKey,
            Namespace = enqueueRequest.Namespace,
            CreatedAt = metadata.CreatedAt,
            StartAt = workflowRequest.StartAt,
            BackoffUntil = workflowRequest.StartAt,
            Status = PersistentItemStatus.Enqueued,
            Labels = enqueueRequest.Labels,
            Context = enqueueRequest.Context,
            DistributedTraceContext = metadata.TraceContext,
            Metadata = workflowRequest.Metadata,
            InitialState = workflowRequest.State,
            Steps = workflowRequest
                .Steps.Select(s => new Step
                {
                    DatabaseId = Guid.CreateVersion7(),
                    OperationId = s.OperationId,
                    IdempotencyKey = $"{idempotencyKey}/{s.OperationId}",
                    Status = PersistentItemStatus.Enqueued,
                    CreatedAt = metadata.CreatedAt,
                    ProcessingOrder = order++,
                    Command = s.Command,
                    RetryStrategy = s.RetryStrategy,
                    Metadata = s.Metadata,
                })
                .ToList(),
        };
    }

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
}
