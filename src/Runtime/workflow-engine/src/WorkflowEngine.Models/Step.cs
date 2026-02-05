using WorkflowEngine.Resilience.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Models;

public sealed record Step : PersistentItem
{
    public required int ProcessingOrder { get; init; }
    public required Command Command { get; init; }
    public required Actor Actor { get; init; }

    public DateTimeOffset? StartAt { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public RetryStrategy? RetryStrategy { get; init; }
    public int RequeueCount { get; set; }
    public Task<ExecutionResult>? ExecutionTask { get; set; }

    public DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Step FromRequest(EngineRequest parent, StepRequest request, DateTimeOffset createdAt, int index) =>
        new()
        {
            DatabaseId = 0,
            IdempotencyKey = $"{parent.IdempotencyKey}/{request.Command}",
            OperationId = request.Command.OperationId,
            Actor = parent.Actor,
            CreatedAt = createdAt,
            StartAt = request.StartAt,
            ProcessingOrder = index,
            Command = request.Command,
            RetryStrategy = request.RetryStrategy,
        };

    public override string ToString() => $"[{nameof(Step)}.{Command.GetType().Name}] {IdempotencyKey} ({Status})";

    public override int GetHashCode() => IdempotencyKey.GetHashCode(StringComparison.InvariantCulture);

    public bool Equals(Step? other) =>
        other?.IdempotencyKey.Equals(IdempotencyKey, StringComparison.OrdinalIgnoreCase) is true;

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            ExecutionTask?.Dispose();
            base.Dispose(disposing);
        }
    }
}
