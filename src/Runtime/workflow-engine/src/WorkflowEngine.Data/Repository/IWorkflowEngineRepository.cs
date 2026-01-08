using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

public interface IWorkflowEngineRepository
{
    Task<IReadOnlyList<Workflow>> GetIncompleteWorkflows(CancellationToken cancellationToken = default);
    Task<Workflow> AddWorkflow(Request request, CancellationToken cancellationToken = default);
    Task UpdateWorkflow(Workflow workflow, CancellationToken cancellationToken = default);
    Task UpdateStep(Step step, CancellationToken cancellationToken = default);
}
