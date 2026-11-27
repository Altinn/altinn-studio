using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// Result of <see cref="Repository.IEngineRepository.CountIncompleteWorkflowsByStatus"/>: the incomplete workflows per
/// status, and how many of the <see cref="PersistentItemStatus.Enqueued"/> ones start in the future.
/// </summary>
internal sealed record IncompleteWorkflowCounts(IReadOnlyDictionary<PersistentItemStatus, int> ByStatus, int Scheduled);
