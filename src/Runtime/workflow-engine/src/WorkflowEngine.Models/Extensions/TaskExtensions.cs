namespace WorkflowEngine.Models.Extensions;

public static class TaskExtensions
{
    public static TaskStatus Status(this Task? task)
    {
        return task switch
        {
            null => TaskStatus.None,
            { IsCompleted: false } => TaskStatus.Started,
            { IsFaulted: true } => TaskStatus.Failed,
            { IsCompleted: true } => TaskStatus.Finished,
        };
    }

    /// <summary>
    /// Returns a task that completes after the source task, followed by the specified delay.
    /// </summary>
    public static async Task Debounce(this Task task, TimeSpan delay, CancellationToken cancellationToken = default)
    {
        await task;
        await Task.Delay(delay, cancellationToken);
    }

    /// <inheritdoc cref="Debounce(Task, TimeSpan, CancellationToken)"/>
    public static Task Debounce(
        this TaskCompletionSource tcs,
        TimeSpan delay,
        CancellationToken cancellationToken = default
    ) => tcs.Task.Debounce(delay, cancellationToken);
}
