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
    /// The idempotency key for this workflow, unique within a namespace.
    /// </summary>
    public required string IdempotencyKey { get; set; }

    /// <summary>
    /// Primary isolation boundary. Idempotency keys are unique within a namespace.
    /// Example: an instance GUID, a customer ID, a project ID — whatever the host defines.
    /// </summary>
    public required string Namespace { get; init; }

    /// <summary>
    /// Opaque context passed to command handlers at execution time.
    /// The engine stores but never inspects this. Handlers deserialize what they need.
    /// Example: {"lockToken":"...", "actor":{...}, "commandEndpoint":"..."}
    /// </summary>
    public JsonElement? Context { get; init; }

    public DateTimeOffset? StartAt { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public DateTimeOffset? HeartbeatAt { get; set; }
    public int ReclaimCount { get; set; }

    /// <summary>
    /// Per-fetch lease identifier. <c>null</c> until the workflow is first fetched; a fresh token is
    /// then issued on every fetch by the engine and asserted on heartbeat and write-back to prevent
    /// a stale worker from writing over a workflow that has been reclaimed by another host. Cleared
    /// on every transition out of <c>Processing</c> (terminal write-back, resume, poison abandon,
    /// stale reclaim) to maintain the invariant "<c>LeaseToken IS NOT NULL iff Status = Processing</c>",
    /// which is what makes a frozen owner's later CAS fail deterministically.
    /// </summary>
    public Guid? LeaseToken { get; set; }

    public required IReadOnlyList<Step> Steps { get; init; }
    public string? DistributedTraceContext { get; set; }
    public DateTimeOffset? CancellationRequestedAt { get; set; }
    public IEnumerable<Workflow>? Dependencies { get; init; }
    public IEnumerable<Workflow>? Links { get; init; }
    public string? InitialState { get; init; }

    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
}
