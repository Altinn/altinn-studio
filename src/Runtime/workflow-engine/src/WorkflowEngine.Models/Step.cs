using WorkflowEngine.Resilience.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Models;

/// <summary>
/// A Step is a single unit of work within a <see cref="Workflow"/>.
/// Steps execute in ascending <see cref="ProcessingOrder"/>.
/// </summary>
public sealed record Step : PersistentItem
{
    /// <summary>
    /// Zero-based execution order within the parent workflow.
    /// </summary>
    public required int ProcessingOrder { get; init; }

    /// <summary>
    /// The command this step executes. Resolved against the engine's command registry at runtime.
    /// </summary>
    public required CommandDefinition Command { get; init; }

    /// <summary>
    /// Optional per-step retry strategy. When <c>null</c>, the engine uses <see cref="EngineSettings.DefaultStepRetryStrategy"/>.
    /// </summary>
    public RetryStrategy? RetryStrategy { get; init; }

    /// <summary>
    /// Number of times this step has been requeued after a retryable failure.
    /// </summary>
    public int RequeueCount { get; set; }

#pragma warning disable CA1002, CA2227 // Mutable domain entity — List<T> with setter is intentional
    /// <summary>
    /// Errors recorded across this step's execution attempts, in chronological order.
    /// </summary>
    public List<ErrorEntry> ErrorHistory { get; set; } = [];
#pragma warning restore CA1002, CA2227

    /// <summary>
    /// State produced by this step, passed as <see cref="CommandExecutionContext.StateIn"/> to the next step.
    /// </summary>
    public string? StateOut { get; set; }

    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    /// <inheritdoc/>
    public override string ToString() => $"[{nameof(Step)}.{Command.Type}] {OperationId} ({Status})";

    /// <inheritdoc/>
    public override int GetHashCode() => DatabaseId.GetHashCode();

    /// <summary>
    /// Records are equal when their <see cref="PersistentItem.DatabaseId"/> matches; the step row, not the in-memory snapshot, is the identity.
    /// </summary>
    public bool Equals(Step? other) => other?.DatabaseId == DatabaseId;
}
