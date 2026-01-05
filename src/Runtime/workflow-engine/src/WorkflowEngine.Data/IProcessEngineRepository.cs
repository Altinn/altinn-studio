using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

public interface IProcessEngineRepository
{
    Task<IReadOnlyList<ProcessEngineJob>> GetIncompleteJobs(CancellationToken cancellationToken = default);
    Task<ProcessEngineJob> AddJob(ProcessEngineJobRequest jobRequest, CancellationToken cancellationToken = default);
    Task UpdateJob(ProcessEngineJob job, CancellationToken cancellationToken = default);
    Task UpdateTask(ProcessEngineTask task, CancellationToken cancellationToken = default);
}
