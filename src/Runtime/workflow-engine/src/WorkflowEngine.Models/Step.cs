using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

public sealed record Step : PersistentItem
{
    public required int ProcessingOrder { get; init; }
    public required Command Command { get; init; }
    public required Actor Actor { get; init; }

    public DateTimeOffset? StartTime { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public RetryStrategy? RetryStrategy { get; init; }
    public int RequeueCount { get; set; }
    public Task<ExecutionResult>? ExecutionTask { get; set; }

    /// <summary>
    /// The initial start time representing the first time this step was scheduled to run.
    /// Used to calculate the deadline for the associated <see cref="RetryStrategy"/>.
    /// </summary>
    public DateTimeOffset? InitialStartTime { get; set; }

    public static Step FromRequest(string jobIdentifier, CommandRequest request, Actor actor, int index) =>
        new()
        {
            DatabaseId = 0,
            Key = $"{jobIdentifier}/{request.Command}",
            Actor = actor,
            StartTime = request.StartTime,
            InitialStartTime = request.StartTime,
            ProcessingOrder = index,
            Command = request.Command,
            RetryStrategy = request.RetryStrategy,
        };

    public override string ToString() => $"[{nameof(Step)}.{Command.GetType().Name}] {Key} ({Status})";

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            ExecutionTask?.Dispose();
            DatabaseTask?.Dispose();
            base.Dispose(disposing);
        }
    }
}
