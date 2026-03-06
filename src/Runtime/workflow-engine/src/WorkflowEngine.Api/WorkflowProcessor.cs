using System.Diagnostics;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Api;

/// <summary>
/// Background processing loop that fetches work from the database using FOR UPDATE SKIP LOCKED,
/// dispatches workflows to fire-and-forget workers via <see cref="WorkflowHandler"/>.
/// </summary>
internal sealed class WorkflowProcessor(
    IEngineNpgsqlRepository repo,
    IServiceScopeFactory scopeFactory,
    AsyncSignal workflowSignal,
    IOptions<WorkflowProcessorOptions> options,
    IEngineStatus engineStatus,
    ILogger<WorkflowProcessor> logger
) : BackgroundService
{
    private readonly int _maxWorkers = options.Value.MaxWorkers;
    private readonly SemaphoreSlim _semaphore = new(options.Value.MaxWorkers, options.Value.MaxWorkers);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.ProcessorStarted(_maxWorkers);

        // TODO: Replace by UpDownCounter?
        if (engineStatus is EngineStatusProvider provider)
        {
            provider.SetProcessorSemaphore(_semaphore);
        }

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                Metrics.EngineMainLoopIterations.Add(1);
                var stopwatch = Stopwatch.StartNew();

                workflowSignal.Reset();

                var available = _semaphore.CurrentCount;

                if (available > 0)
                {
                    var workflows = await repo.FetchAndLockWorkflows(available, stoppingToken);

                    if (workflows.Count > 0)
                    {
                        logger.FetchedWorkflows(workflows.Count, available);
                    }

                    foreach (var workflow in workflows)
                    {
                        await _semaphore.WaitAsync(stoppingToken);
                        _ = ProcessWorkflowAsync(workflow, stoppingToken);
                    }

                    Metrics.EngineMainLoopTotalTime.Record(stopwatch.Elapsed.TotalSeconds);
                }

                await Task.WhenAny(
                    Debounce(workflowSignal, TimeSpan.FromMilliseconds(10), stoppingToken),
                    Task.Delay(TimeSpan.FromMilliseconds(500), stoppingToken)
                );
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        logger.ProcessorShuttingDown(_maxWorkers - _semaphore.CurrentCount);

        for (int i = 0; i < _maxWorkers; i++)
        {
            await _semaphore.WaitAsync(CancellationToken.None);
        }

        logger.ProcessorAllWorkersFinished();

        logger.ProcessorStopped();
    }

    private async Task ProcessWorkflowAsync(Workflow workflow, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<WorkflowHandler>();
            await handler.HandleAsync(workflow, ct);
        }
        finally
        {
            _semaphore.Release();
        }

        workflowSignal.Signal();
    }

    private static async Task Debounce(AsyncSignal signal, TimeSpan delay, CancellationToken ct)
    {
        await signal.WaitAsync(ct);
        await Task.Delay(delay, ct);
    }

    public override void Dispose()
    {
        _semaphore.Dispose();
        base.Dispose();
    }
}

/// <summary>
/// Configuration options for the <see cref="WorkflowProcessor"/>.
/// </summary>
internal sealed class WorkflowProcessorOptions
{
    /// <summary>Maximum number of concurrent workflow processing workers.</summary>
    public int MaxWorkers { get; set; } = 300;
}

/// <summary>
/// Source-generated log messages for <see cref="WorkflowProcessor"/>.
/// </summary>
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
}
