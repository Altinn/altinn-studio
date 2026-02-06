namespace WorkflowEngine.Models;

public enum ExecutionStatus
{
    /// <summary>
    /// The execution was successful.
    /// </summary>
    Success,

    /// <summary>
    /// The execution was canceled.
    /// </summary>
    Canceled,

    /// <summary>
    /// The execution failed with a retryable error. This indicates a failure that may succeed when retried.
    /// </summary>
    RetryableError,

    /// <summary>
    /// The execution failed with a critical error. This indicates a non-recoverable failure that should not be retried.
    /// </summary>
    CriticalError,
}
