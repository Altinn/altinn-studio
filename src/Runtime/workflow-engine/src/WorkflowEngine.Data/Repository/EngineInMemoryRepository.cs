using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

/// <summary>
/// In-memory repository for ProcessEngine operations.
/// Simulates database latency for performance testing.
/// </summary>
internal sealed class EngineInMemoryRepository : IEngineRepository
{
    public async Task<IReadOnlyList<Workflow>> GetIncompleteWorkflows(CancellationToken cancellationToken = default)
    {
        await SimulateDatabaseDelay(cancellationToken);
        return [];
    }

    public async Task<Workflow> AddWorkflow(Request request, CancellationToken cancellationToken = default)
    {
        await SimulateDatabaseDelay(cancellationToken);
        return Workflow.FromRequest(request);
    }

    public async Task UpdateWorkflow(Workflow workflow, CancellationToken cancellationToken = default) =>
        await SimulateDatabaseDelay(cancellationToken);

    public async Task UpdateStep(Step step, CancellationToken cancellationToken = default) =>
        await SimulateDatabaseDelay(cancellationToken);

    private static async Task SimulateDatabaseDelay(CancellationToken cancellationToken = default) =>
        await Task.Delay(Random.Shared.Next(50, 500), cancellationToken);
}
