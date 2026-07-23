namespace WorkflowEngine.Models;

/// <summary>
/// The outcome of a single command execution. Returned by <see cref="Abstractions.ICommand.Execute"/>
/// and consumed by the engine to decide whether to advance, retry, or fail the step.
/// </summary>
/// <param name="Status">The classification of the outcome.</param>
/// <param name="Message">Optional message describing the outcome (used for logs and step error history).</param>
/// <param name="Exception">Optional exception associated with a failed outcome.</param>
/// <param name="HttpStatusCode">Optional HTTP status code captured from the underlying transport.</param>
/// <param name="DeferDelay">For <see cref="ExecutionStatus.Deferred"/> outcomes: how long to wait before re-executing the step.</param>
public record struct ExecutionResult(
    ExecutionStatus Status,
    string? Message = null,
    Exception? Exception = null,
    int? HttpStatusCode = null,
    TimeSpan? DeferDelay = null
)
{
    /// <summary>
    /// Creates a successful execution result.
    /// </summary>
    public static ExecutionResult Success() => new(ExecutionStatus.Success);

    /// <summary>
    /// Creates a canceled execution result.
    /// </summary>
    public static ExecutionResult Canceled() => new(ExecutionStatus.Canceled);

    /// <summary>
    /// Creates a retryable error execution result. This indicates a failure that may succeed when retried.
    /// </summary>
    public static ExecutionResult RetryableError(
        string message,
        Exception? exception = null,
        int? httpStatusCode = null
    ) => new(ExecutionStatus.RetryableError, message, exception, httpStatusCode);

    /// <summary>
    /// Creates a retryable error execution result. This indicates a failure that may succeed when retried.
    /// </summary>
    public static ExecutionResult RetryableError(Exception exception) =>
        new(ExecutionStatus.RetryableError, exception.Message, exception);

    /// <summary>
    /// Creates a critical error execution result. This is a non-recoverable error that should not be retried.
    /// </summary>
    public static ExecutionResult CriticalError(
        string message,
        Exception? exception = null,
        int? httpStatusCode = null
    ) => new(ExecutionStatus.CriticalError, message, exception, httpStatusCode);

    /// <summary>
    /// Creates a critical error execution result. This is a non-recoverable error that should not be retried.
    /// </summary>
    public static ExecutionResult CriticalError(Exception exception) =>
        new(ExecutionStatus.CriticalError, exception.Message, exception);

    /// <summary>
    /// Creates a deferred execution result: the command ran without error, but the outcome it is
    /// waiting for is not available yet. The engine parks the step in
    /// <see cref="PersistentItemStatus.Waiting"/> and re-executes it after <paramref name="delay"/>,
    /// releasing the worker slot in the meantime. Deferrals are not failures — they record no error
    /// history and reset the step's retry counter — but their total wall-clock time is bounded by the
    /// step's wait budget (<see cref="CommandDefinition.MaxWaitDuration"/> or the engine default).
    /// </summary>
    public static ExecutionResult Defer(TimeSpan delay, string? message = null) =>
        new(ExecutionStatus.Deferred, message, DeferDelay: delay);
};
