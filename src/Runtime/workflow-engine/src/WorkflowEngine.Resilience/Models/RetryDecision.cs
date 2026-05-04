namespace WorkflowEngine.Resilience.Models;

/// <summary>
/// Returned by a caller-supplied error classifier to tell the retry pipeline whether to keep retrying or abort.
/// </summary>
public enum RetryDecision
{
    /// <summary>
    /// Stop retrying and rethrow the captured exception.
    /// </summary>
    Abort,

    /// <summary>
    /// Continue retrying according to the active <see cref="RetryStrategy"/>.
    /// </summary>
    Retry,
}
