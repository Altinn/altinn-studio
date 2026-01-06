using System.Diagnostics.CodeAnalysis;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// In-memory repository for ProcessEngine operations.
/// Simulates database latency for performance testing.
/// </summary>
internal sealed class ProcessEngineInMemoryRepository : IProcessEngineRepository
{
    public async Task<IReadOnlyList<Workflow>> GetIncompleteJobs(CancellationToken cancellationToken = default)
    {
        await SimulateDatabaseDelay(cancellationToken);
        return [];
    }

    public async Task<Workflow> AddJob(Request request, CancellationToken cancellationToken = default)
    {
        await SimulateDatabaseDelay(cancellationToken);
        return Workflow.FromRequest(request);
    }

    public async System.Threading.Tasks.Task UpdateJob(
        Workflow workflow,
        CancellationToken cancellationToken = default
    ) => await SimulateDatabaseDelay(cancellationToken);

    public async System.Threading.Tasks.Task UpdateTask(Step step, CancellationToken cancellationToken = default) =>
        await SimulateDatabaseDelay(cancellationToken);

    [SuppressMessage("Security", "CA5394:Do not use insecure randomness")]
    private static async System.Threading.Tasks.Task SimulateDatabaseDelay(
        CancellationToken cancellationToken = default
    ) => await System.Threading.Tasks.Task.Delay(Random.Shared.Next(50, 500), cancellationToken);
}
