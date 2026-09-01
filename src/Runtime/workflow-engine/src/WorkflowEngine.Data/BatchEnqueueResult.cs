namespace WorkflowEngine.Data;

/// <summary>
/// Result of a batch enqueue operation for a single request.
/// </summary>
internal sealed record BatchEnqueueResult(
    BatchEnqueueResultStatus Status,
    Guid[]? WorkflowIds,
    string? ErrorMessage = null
)
{
    public static BatchEnqueueResult Created(Guid[] workflowIds) => new(BatchEnqueueResultStatus.Created, workflowIds);

    public static BatchEnqueueResult Duplicate(Guid[] workflowIds) =>
        new(BatchEnqueueResultStatus.Duplicate, workflowIds);

    public static BatchEnqueueResult Conflicted() => new(BatchEnqueueResultStatus.Conflict, null);

    public static BatchEnqueueResult InvalidRef(string message) =>
        new(BatchEnqueueResultStatus.InvalidReference, null, message);

    /// <summary>
    /// The flush refused a request because of the mailbox one of its workflows declared. Whatever the flush had
    /// already written for the request is undone before it commits — including its idempotency key.
    /// </summary>
    public static BatchEnqueueResult MailboxRejected(BatchEnqueueResultStatus status, string message) =>
        new(status, null, message);
}
