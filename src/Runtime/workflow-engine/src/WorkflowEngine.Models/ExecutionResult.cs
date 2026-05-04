namespace WorkflowEngine.Models;

/// <summary>
/// The outcome of a single command execution. Returned by <see cref="Abstractions.ICommand.Execute"/>
/// and consumed by the engine to decide whether to advance, retry, or fail the step.
/// </summary>
/// <param name="Status">The classification of the outcome.</param>
/// <param name="Message">Optional message describing the outcome (used for logs and step error history).</param>
/// <param name="Exception">Optional exception associated with a failed outcome.</param>
/// <param name="HttpStatusCode">Optional HTTP status code captured from the underlying transport.</param>
public record struct ExecutionResult(
    ExecutionStatus Status,
    string? Message = null,
    Exception? Exception = null,
    int? HttpStatusCode = null
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
};
