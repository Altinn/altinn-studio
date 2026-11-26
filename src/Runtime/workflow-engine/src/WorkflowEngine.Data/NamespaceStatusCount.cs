using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// How many of a namespace's workflows are in <paramref name="Status"/>, one row of
/// <see cref="Repository.IEngineRepository.CountIncompleteAndFailedWorkflowsByNamespace"/>. <paramref name="Scheduled"/>
/// is set only on <see cref="PersistentItemStatus.Enqueued"/> rows, for the ones that start in the future.
/// </summary>
internal sealed record NamespaceStatusCount(string Namespace, PersistentItemStatus Status, bool Scheduled, int Count);
