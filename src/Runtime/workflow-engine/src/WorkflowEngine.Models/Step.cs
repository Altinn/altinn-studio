using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

public sealed record Step : PersistentItem
{
    public required int ProcessingOrder { get; init; }
    public required Command Command { get; init; }
    public required Actor Actor { get; init; }

    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset? StartAt { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public RetryStrategy? RetryStrategy { get; init; }
    public int RequeueCount { get; set; }
    public Task<ExecutionResult>? ExecutionTask { get; set; }

    public DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Step FromRequest(
        string jobIdentifier,
        CommandRequest request,
        Actor actor,
        DateTimeOffset now,
        int index
    ) =>
        new()
        {
            DatabaseId = 0,
            IdempotencyKey = $"{jobIdentifier}/{request.Command}",
            Actor = actor,
            StartAt = request.StartAt,
            FirstSeenAt = now,
            ProcessingOrder = index,
            Command = request.Command,
            RetryStrategy = request.RetryStrategy,
        };

    public override string ToString() => $"[{nameof(Step)}.{Command.GetType().Name}] {IdempotencyKey} ({Status})";

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            ExecutionTask?.Dispose();
            base.Dispose(disposing);
        }
    }
}
