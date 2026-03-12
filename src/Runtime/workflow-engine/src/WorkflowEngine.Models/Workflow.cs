using System.Text.Json;

namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
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
    public required IReadOnlyList<Step> Steps { get; init; }
    public string? DistributedTraceContext { get; set; }
    public IEnumerable<Workflow>? Dependencies { get; init; }
    public IEnumerable<Workflow>? Links { get; init; }
    public string? InitialState { get; init; }

    internal Task? DatabaseTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
}
