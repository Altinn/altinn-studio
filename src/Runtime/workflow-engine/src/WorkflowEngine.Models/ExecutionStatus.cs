namespace WorkflowEngine.Models;

/// <summary>
/// Classification of an <see cref="ExecutionResult"/>. Determines whether the engine advances, retries, or fails the step.
/// </summary>
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

    /// <summary>
    /// The execution completed without error, but the outcome it is waiting for is not available yet.
    /// The step is parked in <see cref="PersistentItemStatus.Waiting"/> and re-executed after
    /// <see cref="ExecutionResult.DeferDelay"/>. Not a failure: deferrals record no error history
    /// and do not count against the step's retry budget.
    /// </summary>
    Deferred,
}
