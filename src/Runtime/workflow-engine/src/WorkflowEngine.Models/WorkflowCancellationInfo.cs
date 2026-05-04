namespace WorkflowEngine.Models;

/// <summary>
/// Snapshot of a workflow's cancellation state, used by the cancellation watcher to decide whether to propagate cancellation.
/// </summary>
/// <param name="Status">Current lifecycle status of the workflow.</param>
/// <param name="CancellationRequestedAt">When cancellation was requested, or <c>null</c> if no request is pending.</param>
public sealed record WorkflowCancellationInfo(PersistentItemStatus Status, DateTimeOffset? CancellationRequestedAt);
