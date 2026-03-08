using WorkflowEngine.Resilience.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Models;

public sealed record Step : PersistentItem
{
    public required int ProcessingOrder { get; init; }
    public required Command Command { get; init; }

    public DateTimeOffset? BackoffUntil { get; set; }
    public RetryStrategy? RetryStrategy { get; init; }
    public int RequeueCount { get; set; }
    public string? LastError { get; set; }
    public string? StateOut { get; set; }

    internal Task<ExecutionResult>? ExecutionTask { get; set; }
    internal DateTimeOffset? ExecutionStartedAt { get; set; }
    internal bool HasPendingChanges { get; set; }

    public override string ToString() => $"[{nameof(Step)}.{Command.Type}] {OperationId} ({Status})";

    public override int GetHashCode() => DatabaseId.GetHashCode();

    public bool Equals(Step? other) => other?.DatabaseId == DatabaseId;
}
