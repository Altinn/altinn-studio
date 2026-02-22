using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

public interface IEngineRepository
{
    /// <summary>
    /// Gets all active workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all scheduled workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all failed workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFailedWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the number of active workflows.
    /// </summary>
    Task<int> CountActiveWorkflows(bool bypassConcurrencyLimit = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of scheduled workflows.
    /// </summary>
    Task<int> CountScheduledWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the number of failed workflows.
    /// </summary>
    Task<int> CountFailedWorkflows(bool bypassConcurrencyLimit = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new workflow to the repository.
    /// </summary>
    Task<Workflow> AddWorkflow(
        EngineRequest engineRequest,
        bool bypassConcurrencyLimit = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates a workflow in the repository.
    /// </summary>
    Task UpdateWorkflow(
        Workflow workflow,
        bool bypassConcurrencyLimit = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates the specified step in the workflow repository.
    /// </summary>
    Task UpdateStep(Step step, bool bypassConcurrencyLimit = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of suspended workflows.
    /// </summary>
    Task<int> CountSuspendedWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a reply for the specified step, if one exists.
    /// </summary>
    Task<Reply?> GetReplyForStep(long stepId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a reply by the correlation ID of the step it is attached to.
    /// </summary>
    Task<Reply?> GetReplyByCorrelationId(Guid correlationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a reply to the repository.
    /// </summary>
    Task AddReply(Reply reply, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the workflow that contains the specified step.
    /// </summary>
    Task<Workflow?> GetWorkflowByStepId(long stepId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the workflow that contains a step with the specified correlation ID.
    /// </summary>
    Task<Workflow?> GetWorkflowByCorrelationId(Guid correlationId, CancellationToken cancellationToken = default);
}
