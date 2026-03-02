using System.Diagnostics;

namespace WorkflowEngine.Models;

public abstract record PersistentItem
{
    public long DatabaseId { get; internal set; }
    public required string OperationId { get; init; }

    public required string IdempotencyKey { get; set; }
    public PersistentItemStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; internal set; }
    public string? Metadata { get; init; }
    public string? EngineTraceId { get; set; }

    internal Activity? EngineActivity { get; set; }
}
