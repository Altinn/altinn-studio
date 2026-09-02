namespace WorkflowEngine.Data;

internal enum BatchEnqueueResultStatus
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

    /// <summary>
    /// The declared mailbox does not exist in the namespace — nothing could ever release the receiver.
    /// </summary>
    MailboxNotFound,

    MailboxLogFull,
}
