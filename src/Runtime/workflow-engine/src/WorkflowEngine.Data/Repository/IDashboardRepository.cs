using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

public interface IDashboardRepository
{
    /// <summary>
    /// Gets all active workflows (steps only, no dependencies/links).
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets finished workflows filtered by the specified statuses.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
        IReadOnlyList<PersistentItemStatus> statuses,
        int? take = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets finished workflows with a total count of matching rows (single DB slot).
    /// </summary>
    Task<(IReadOnlyList<Workflow> Workflows, int TotalCount)> GetFinishedWorkflowsWithCount(
        IReadOnlyList<PersistentItemStatus> statuses,
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        string? org = null,
        string? app = null,
        string? party = null,
        string? instanceGuid = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all scheduled workflows (steps only, no dependencies/links).
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of scheduled workflows.
    /// </summary>
    Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all distinct org+app pairs.
    /// </summary>
    Task<IReadOnlyList<(string Org, string App)>> GetDistinctOrgsAndApps(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the full workflow (with steps) by database ID, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(Guid workflowId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the supplied workflow and steps in a single transaction.
    /// </summary>
    Task BatchUpdateWorkflowAndSteps(
        Workflow workflow,
        IReadOnlyList<Step> steps,
        CancellationToken cancellationToken = default
    );
}
