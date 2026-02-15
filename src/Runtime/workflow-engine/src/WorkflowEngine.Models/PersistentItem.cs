using System.Diagnostics;

namespace WorkflowEngine.Models;

public abstract record PersistentItem
{
    public long DatabaseId { get; internal set; }
    public required string IdempotencyKey { get; init; }
    public required string OperationId { get; set; }
    public PersistentItemStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; internal set; }
    public string? DistributedTraceContext { get; set; }
    public ActivityContext? EngineTraceContext { get; set; }

    public Task? DatabaseTask { get; set; }
}
