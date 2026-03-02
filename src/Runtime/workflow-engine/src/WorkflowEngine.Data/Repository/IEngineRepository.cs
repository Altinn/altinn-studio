using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

public interface IEngineRepository
{
    /// <summary>
    /// Gets all active workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all scheduled workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets finished workflows filtered by the specified statuses.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
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
    /// Gets finished workflows with a total count of matching rows (single DB slot).
    /// The count ignores the <paramref name="take"/> and <paramref name="before"/> (cursor) parameters.
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
    /// Gets a workflow by idempotency key and creation time.
    /// </summary>
    Task<Workflow?> GetWorkflow(
        string idempotencyKey,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all distinct org+app pairs.
    /// </summary>
    Task<IReadOnlyList<(string Org, string App)>> GetDistinctOrgsAndApps(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of active workflows.
    /// </summary>
    Task<int> CountActiveWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of scheduled workflows.
    /// </summary>
    Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of failed workflows.
    /// </summary>
    Task<int> CountFailedWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the status of a workflow by its database ID, or null if not found.
    /// </summary>
    Task<PersistentItemStatus?> GetWorkflowStatus(long workflowId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new workflow to the repository.
    /// </summary>
    Task<Workflow> AddWorkflow(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Inserts a batch of workflows in a single transaction. Requests must be in topological dependency order.
    /// Within-batch <c>DependsOn</c> refs are resolved to database IDs as each item is inserted.
    /// </summary>
    Task<IReadOnlyList<Workflow>> AddWorkflowBatch(
        IReadOnlyList<WorkflowRequest> orderedRequests,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates a workflow in the repository.
    /// </summary>
    Task UpdateWorkflow(Workflow workflow, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the specified step in the workflow repository.
    /// </summary>
    Task UpdateStep(Step step, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the supplied steps in a single transaction.
    /// </summary>
    Task BatchUpdateWorkflowAndSteps(
        Workflow workflow,
        IReadOnlyList<Step> steps,
        bool updateWorkflowTimestamp = true,
        bool updateStepTimestamps = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all active (incomplete) workflows for the given instance GUID.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflowsForInstance(
        Guid instanceGuid,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the full workflow (with steps) by database ID, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(long workflowId, CancellationToken cancellationToken = default);
}
