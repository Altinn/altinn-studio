using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

public interface IProcessEngineRepository
{
    Task<IReadOnlyList<Workflow>> GetIncompleteJobs(CancellationToken cancellationToken = default);
    Task<Workflow> AddJob(Request request, CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task UpdateJob(Workflow workflow, CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task UpdateTask(Step step, CancellationToken cancellationToken = default);
}
