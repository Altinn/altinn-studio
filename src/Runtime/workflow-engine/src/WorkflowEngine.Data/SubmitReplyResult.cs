namespace WorkflowEngine.Data;

/// <summary>
/// Result of a reply submission operation.
/// </summary>
public enum SubmitReplyResult
{
    /// <summary>
    /// The reply was accepted and processed for the first time.
    /// </summary>
    Accepted,

    /// <summary>
    /// The idempotency key matched and the payload hash is identical — safe retry.
    /// </summary>
    Duplicate,

    /// <summary>
    /// The idempotency key matched but the payload hash differs — conflict.
    /// </summary>
    Conflict,

    /// <summary>
    /// The reply ID was not found.
    /// </summary>
    NotFound,
}
