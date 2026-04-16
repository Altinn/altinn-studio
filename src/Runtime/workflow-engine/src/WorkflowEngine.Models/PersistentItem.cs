using System.Diagnostics;

namespace WorkflowEngine.Models;

public abstract record PersistentItem
{
    public Guid DatabaseId { get; internal set; }
    public required string OperationId { get; init; }

    public PersistentItemStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; internal set; }
    public Dictionary<string, string>? Labels { get; init; }
    public string? EngineTraceContext { get; set; }

    public Activity? EngineActivity { get; set; }
}
