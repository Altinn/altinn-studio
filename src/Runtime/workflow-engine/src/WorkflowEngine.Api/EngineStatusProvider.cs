using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

/// <summary>
/// Provides engine status information for dashboard, health checks, and metrics.
/// </summary>
internal interface IEngineStatus
{
    /// <summary>Current engine health status flags.</summary>
    EngineHealthStatus Status { get; }

    /// <summary>Number of workflows currently being processed (active workers).</summary>
    int ActiveWorkerCount { get; }

    /// <summary>Maximum number of concurrent workers.</summary>
    int MaxWorkers { get; }

    /// <summary>Returns recently completed workflows for the dashboard.</summary>
    IReadOnlyList<DashboardWorkflowDto> GetRecentWorkflows(int count);

    /// <summary>Records a completed workflow into the recent cache.</summary>
    void RecordCompletion(Workflow workflow);

    /// <summary>Removes a workflow from the recent cache (e.g. after manual retry).</summary>
    void RemoveFromRecent(string idempotencyKey);
}

/// <summary>
/// Singleton adapter that derives engine status from the new processor components.
/// </summary>
internal sealed class EngineStatusProvider : IEngineStatus
{
    private readonly int _maxWorkers;
    private readonly RecentWorkflowCache _recentWorkflows = new();
    private volatile SemaphoreSlim? _processorSemaphore;

    public EngineStatusProvider(IOptions<WorkflowProcessorOptions> options)
    {
        _maxWorkers = options.Value.MaxWorkers;
    }

    /// <summary>
    /// Called by <see cref="WorkflowProcessor"/> during startup to share its semaphore.
    /// This allows the status provider to read the current worker count without coupling.
    /// </summary>
    internal void SetProcessorSemaphore(SemaphoreSlim semaphore)
    {
        _processorSemaphore = semaphore;
    }

    public EngineHealthStatus Status
    {
        get
        {
            if (_processorSemaphore is null)
                return EngineHealthStatus.Stopped;

            return EngineHealthStatus.Running | EngineHealthStatus.Healthy;
        }
    }

    public int ActiveWorkerCount => _processorSemaphore is { } sem ? _maxWorkers - sem.CurrentCount : 0;

    public int MaxWorkers => _maxWorkers;

    public IReadOnlyList<DashboardWorkflowDto> GetRecentWorkflows(int count) => _recentWorkflows.GetRecent(count);

    public void RecordCompletion(Workflow workflow) => _recentWorkflows.Add(workflow);

    public void RemoveFromRecent(string idempotencyKey) => _recentWorkflows.Remove(idempotencyKey);
}
