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
    /// A workflow declared a mailbox that does not exist in the request's namespace, so there is nothing
    /// to receive from and nothing that could ever release the receiver.
    /// </summary>
    MailboxNotFound,

    /// <summary>
    /// A mailbox's receivers log already holds <c>EngineSettings.MaxMailboxLogLength</c> positions, so
    /// no further receiver can be enqueued against it.
    /// </summary>
    MailboxLogFull,
}
