namespace WorkflowEngine.Models;

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
