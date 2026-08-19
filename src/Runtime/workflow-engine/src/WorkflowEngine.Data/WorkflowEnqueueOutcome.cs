namespace WorkflowEngine.Data;

/// <summary>
/// The outcome of a single enqueue request, returned to the caller via the write buffer.
/// </summary>
/// <param name="WorkflowIds">The ids the request's workflows hold; empty when it was refused.</param>
/// <param name="Status">What the flush decided.</param>
/// <param name="Message">
/// Why, for the statuses that are refusals decided inside the flush rather than before it. <c>null</c>
/// for every accepted outcome.
/// </param>
internal sealed record WorkflowEnqueueOutcome(
    Guid[] WorkflowIds,
    BatchEnqueueResultStatus Status,
    string? Message = null
);
