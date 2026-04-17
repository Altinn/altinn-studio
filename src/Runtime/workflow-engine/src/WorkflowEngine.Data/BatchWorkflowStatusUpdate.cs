using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single workflow and its dirty steps for batched status persistence.
/// </summary>
internal sealed record BatchWorkflowStatusUpdate(Workflow Workflow, IReadOnlyList<Step> DirtySteps);

/// <summary>
/// Outcome of a batched write-back. <see cref="Accepted"/> workflows had their state persisted.
/// <see cref="Rejected"/> workflows were silently dropped because the caller's LeaseToken no longer
/// matched the row — the workflow has been reclaimed by another host and the caller is no longer
/// the owner. Rejected workflows' step updates are also skipped within the same transaction.
/// </summary>
internal sealed record BatchUpdateResult(IReadOnlyList<Guid> Accepted, IReadOnlyList<Guid> Rejected);
