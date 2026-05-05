using System.Diagnostics;

namespace WorkflowEngine.Models;

/// <summary>
/// Base class for engine-persisted entities (<see cref="Workflow"/>, <see cref="Step"/>).
/// Carries the identity, lifecycle, and observability fields shared by both.
/// </summary>
public abstract record PersistentItem
{
    /// <summary>
    /// The database row identifier. Assigned by the engine on insert.
    /// </summary>
    public Guid DatabaseId { get; internal set; }

    /// <summary>
    /// Caller-supplied identifier used in logs, telemetry, and idempotency keys.
    /// </summary>
    public required string OperationId { get; init; }

    /// <summary>
    /// Current lifecycle status of this item.
    /// </summary>
    public PersistentItemStatus Status { get; set; }

    /// <summary>
    /// When this item was first persisted.
    /// </summary>
    public DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// Last time this item's row was updated by the engine.
    /// </summary>
    public DateTimeOffset? UpdatedAt { get; internal set; }

    /// <summary>
    /// Optional caller-supplied key/value labels. Stored verbatim and returned in responses.
    /// </summary>
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// W3C trace context (traceparent/tracestate) of the engine activity that owns this item.
    /// Used to stitch downstream spans back to the engine's parent activity.
    /// </summary>
    public string? EngineTraceContext { get; set; }

    /// <summary>
    /// In-memory <see cref="Activity"/> handle for the engine span operating on this item. Not persisted.
    /// </summary>
    public Activity? EngineActivity { get; set; }
}
