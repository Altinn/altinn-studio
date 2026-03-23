using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// Result of <see cref="Repository.IEngineRepository.FetchAndLockWorkflows"/>,
/// separating newly fetched workflows from reclaimed stale ones.
/// </summary>
internal sealed record FetchResult(List<Workflow> Workflows, int ReclaimedCount, int AbandonedCount);
