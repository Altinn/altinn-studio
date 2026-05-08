using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Background processing loop that fetches work from the database using FOR UPDATE SKIP LOCKED,
/// dispatches workflows to fire-and-forget workers via <see cref="WorkflowHandler"/>.
/// Heartbeats are handled by the dedicated <see cref="HeartbeatService"/>.
/// </summary>
internal sealed class WorkflowProcessor(
    IEngineRepository repo,
    IServiceScopeFactory scopeFactory,
    AsyncSignal workflowSignal,
    IConcurrencyLimiter limiter,
    InFlightTracker tracker,
    IEngineStatus engineStatus,
    ILogger<WorkflowProcessor> logger
) : BackgroundService
{
    /// <summary>
    /// Maximum time to wait for in-flight workers during shutdown before giving up.
    /// </summary>
    internal static readonly TimeSpan ShutdownTimeout = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Backoff strategy used when the database is unreachable. Exponential from 1s up to 30s.
    /// </summary>
    private static readonly RetryStrategy _databaseBackoff = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromSeconds(30)
    );

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var activity = Metrics.Source.StartActivity("WorkflowProcessor.ExecuteAsync");
        activity?.DontRecord();

        var maxWorkers = limiter.WorkerSlotStatus.Total;
        int consecutiveDbFailures = 0;

        logger.ProcessorStarted(maxWorkers);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                Metrics.EngineMainLoopIterations.Add(1);
                var loopStart = Stopwatch.GetTimestamp();

                workflowSignal.Reset();

                var available = limiter.WorkerSlotStatus.Available;

                if (available > 0)
                {
                    var serviceStart = Stopwatch.GetTimestamp();

                    try
                    {
                        var workflows = await repo.FetchAndLockWorkflows(available, stoppingToken);

                        if (consecutiveDbFailures > 0)
                        {
                            logger.DatabaseConnectionRestored(consecutiveDbFailures);
                            consecutiveDbFailures = 0;
                            engineStatus.ClearDatabaseUnavailable();
                        }

                        if (workflows.Count > 0)
                        {
                            logger.FetchedWorkflows(workflows.Count, available);
                        }

                        foreach (var workflow in workflows)
                        {
                            await limiter.AcquireWorkerSlot(stoppingToken);
                            _ = ProcessWorkflow(workflow, stoppingToken);
                        }

                        Metrics.EngineMainLoopServiceTime.Record(Stopwatch.GetElapsedTime(serviceStart).TotalSeconds);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        consecutiveDbFailures++;
                        engineStatus.SetDatabaseUnavailable();
                        Metrics.Errors.Add(1, ("operation", "fetchAndLock"));

                        var delay = _databaseBackoff.CalculateDelay(consecutiveDbFailures);
                        logger.DatabaseUnavailable(consecutiveDbFailures, delay, ex);

                        await Task.Delay(delay, stoppingToken);
                        continue;
                    }
                }

                var queueStart = Stopwatch.GetTimestamp();

                await Task.WhenAny(
                    Debounce(workflowSignal, TimeSpan.FromMilliseconds(10), stoppingToken),
                    Task.Delay(TimeSpan.FromMilliseconds(500), stoppingToken)
                );

                Metrics.EngineMainLoopQueueTime.Record(Stopwatch.GetElapsedTime(queueStart).TotalSeconds);
                Metrics.EngineMainLoopTotalTime.Record(Stopwatch.GetElapsedTime(loopStart).TotalSeconds);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        var workerStatus = limiter.WorkerSlotStatus;
        logger.ProcessorShuttingDown(workerStatus.Used);

        using var shutdownCts = new CancellationTokenSource(ShutdownTimeout);
        try
        {
            for (int i = 0; i < maxWorkers; i++)
            {
                await limiter.AcquireWorkerSlot(shutdownCts.Token);
            }

            logger.ProcessorAllWorkersFinished();
        }
        catch (OperationCanceledException)
        {
            logger.ProcessorShutdownTimedOut(limiter.WorkerSlotStatus.Used);
        }

        logger.ProcessorStopped();
    }

    private async Task ProcessWorkflow(Workflow workflow, CancellationToken stoppingToken)
    {
        using var workflowCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);

        if (!tracker.TryAdd(workflow.DatabaseId, workflowCts, workflow))
        {
            logger.WorkflowAlreadyTracked(workflow.DatabaseId);
            Metrics.WorkflowFetchRaceDropped.Add(1);
            limiter.ReleaseWorkerSlot();
            return;
        }

        try
        {
            // If cancellation was already requested before we picked up the workflow,
            // trigger the CTS immediately so the handler sees it
            if (workflow.CancellationRequestedAt is not null)
            {
                await workflowCts.CancelAsync();
            }

            using var scope = scopeFactory.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<WorkflowHandler>();
            await handler.Handle(workflow, workflowCts.Token);
        }
        finally
        {
            tracker.Remove(workflow.DatabaseId);
            limiter.ReleaseWorkerSlot();
        }

        workflowSignal.Signal();
    }

    private static async Task Debounce(AsyncSignal signal, TimeSpan delay, CancellationToken ct)
    {
        await signal.Wait(ct);
        await Task.Delay(delay, ct);
    }
}

internal static partial class WorkflowProcessorLogs
{
    [LoggerMessage(LogLevel.Information, "WorkflowProcessor started (MaxWorkers={MaxWorkers})")]
    internal static partial void ProcessorStarted(this ILogger<WorkflowProcessor> logger, int maxWorkers);

    [LoggerMessage(LogLevel.Debug, "Fetched {Count} workflows (available workers: {Available})")]
    internal static partial void FetchedWorkflows(this ILogger<WorkflowProcessor> logger, int count, int available);

    [LoggerMessage(LogLevel.Information, "Shutdown requested. Waiting for {ActiveCount} workers to finish...")]
    internal static partial void ProcessorShuttingDown(this ILogger<WorkflowProcessor> logger, int activeCount);

    [LoggerMessage(LogLevel.Information, "All workers finished")]
    internal static partial void ProcessorAllWorkersFinished(this ILogger<WorkflowProcessor> logger);

    [LoggerMessage(
        LogLevel.Warning,
        "Shutdown timed out with {ActiveCount} workers still active. Proceeding with shutdown."
    )]
    internal static partial void ProcessorShutdownTimedOut(this ILogger<WorkflowProcessor> logger, int activeCount);

    [LoggerMessage(LogLevel.Information, "WorkflowProcessor shutdown complete")]
    internal static partial void ProcessorStopped(this ILogger<WorkflowProcessor> logger);

    [LoggerMessage(LogLevel.Debug, "Flushing {Count} workflow results to DB")]
    internal static partial void FlushingWorkflowResults(this ILogger<WorkflowProcessor> logger, int count);

    [LoggerMessage(LogLevel.Error, "Workflow {WorkflowId} failed with unhandled exception")]
    internal static partial void WorkflowProcessingError(
        this ILogger<WorkflowProcessor> logger,
        Guid workflowId,
        Exception ex
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Database unavailable (consecutive failures: {FailureCount}), backing off for {Delay}"
    )]
    internal static partial void DatabaseUnavailable(
        this ILogger<WorkflowProcessor> logger,
        int failureCount,
        TimeSpan delay,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "Database connection restored after {FailureCount} consecutive failures")]
    internal static partial void DatabaseConnectionRestored(this ILogger<WorkflowProcessor> logger, int failureCount);

    [LoggerMessage(
        LogLevel.Warning,
        "Workflow {WorkflowId} re-fetched while still in flight on this host — dropping duplicate attempt"
    )]
    internal static partial void WorkflowAlreadyTracked(this ILogger<WorkflowProcessor> logger, Guid workflowId);
}
