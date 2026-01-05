namespace WorkflowEngine.Models;

public sealed record ProcessEngineTask : ProcessEngineItem
{
    public required int ProcessingOrder { get; init; }
    public required ProcessEngineCommand Command { get; init; }
    public required ProcessEngineActor Actor { get; init; }
    public DateTimeOffset? StartTime { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public ProcessEngineRetryStrategy? RetryStrategy { get; init; }
    public int RequeueCount { get; set; }

    public Task<ProcessEngineExecutionResult>? ExecutionTask { get; set; }

    public static ProcessEngineTask FromRequest(
        string jobIdentifier,
        ProcessEngineCommandRequest request,
        ProcessEngineActor actor,
        int index
    ) =>
        new()
        {
            DatabaseId = 0,
            Key = $"{jobIdentifier}/{request.Command}",
            Actor = actor,
            StartTime = request.StartTime,
            ProcessingOrder = index,
            Command = request.Command,
            RetryStrategy = request.RetryStrategy,
        };

    public override string ToString() => $"[{nameof(ProcessEngineTask)}.{Command.GetType().Name}] {Key} ({Status})";

    public new void Dispose()
    {
        ExecutionTask?.Dispose();
        DatabaseTask?.Dispose();
    }
}
