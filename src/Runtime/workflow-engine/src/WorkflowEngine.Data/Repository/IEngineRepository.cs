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
    /// Gets all failed workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFailedWorkflows(CancellationToken cancellationToken = default);

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
    /// Adds a new workflow to the repository.
    /// </summary>
    Task<Workflow> AddWorkflow(EngineRequest engineRequest, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates a workflow in the repository.
    /// </summary>
    Task UpdateWorkflow(Workflow workflow, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the specified step in the workflow repository.
    /// </summary>
    Task UpdateStep(Step step, CancellationToken cancellationToken = default);
}
