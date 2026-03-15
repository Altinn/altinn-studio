namespace WorkflowEngine.Data;

public enum BatchEnqueueResultStatus
{
    /// <summary>
    /// New workflows were created.
    /// </summary>
    Created,

    /// <summary>
    /// Idempotency key matched — returning previously stored workflow IDs.
    /// </summary>
    Duplicate,

    /// <summary>
    /// Idempotency key matched but request body hash differs.
    /// </summary>
    Conflict,

    /// <summary>
    /// One or more workflow dependency/link references could not be resolved.
    /// </summary>
    InvalidReference,
}
