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
}

/// <summary>
/// Singleton adapter that derives engine status from the new processor components.
/// </summary>
internal sealed class EngineStatusProvider : IEngineStatus
{
    private readonly int _maxWorkers;
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
}
