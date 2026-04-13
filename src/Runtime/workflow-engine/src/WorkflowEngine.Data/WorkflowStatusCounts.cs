using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// Result of <see cref="Repository.IEngineRepository.CountWorkflowsByStatus"/>:
/// per-status counts from a single <c>GROUP BY</c> query, plus a scheduled count
/// for workflows that are enqueued with a future <c>StartAt</c>.
/// </summary>
internal sealed record WorkflowStatusCounts(IReadOnlyDictionary<PersistentItemStatus, int> ByStatus, int Scheduled);
