using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// In-memory repository for ProcessEngine operations.
/// Simulates database latency for performance testing.
/// </summary>
internal sealed class ProcessEngineInMemoryRepository : IProcessEngineRepository
{
    public async Task<IReadOnlyList<ProcessEngineJob>> GetIncompleteJobs(CancellationToken cancellationToken = default)
    {
        await SimulateDatabaseDelay(cancellationToken);
        return [];
    }

    public async Task<ProcessEngineJob> AddJob(
        ProcessEngineJobRequest jobRequest,
        CancellationToken cancellationToken = default
    )
    {
        await SimulateDatabaseDelay(cancellationToken);
        return ProcessEngineJob.FromRequest(jobRequest);
    }

    public async Task UpdateJob(ProcessEngineJob job, CancellationToken cancellationToken = default) =>
        await SimulateDatabaseDelay(cancellationToken);

    public async Task UpdateTask(ProcessEngineTask task, CancellationToken cancellationToken = default) =>
        await SimulateDatabaseDelay(cancellationToken);

    [SuppressMessage("Security", "CA5394:Do not use insecure randomness")]
    private static async Task SimulateDatabaseDelay(CancellationToken cancellationToken = default) =>
        await Task.Delay(Random.Shared.Next(50, 500), cancellationToken);
}
