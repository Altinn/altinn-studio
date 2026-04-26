using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

internal sealed class MetricsCollector(
    ILogger<MetricsCollector> logger,
    IEngineStatus engine,
    IEngineRepository engineRepository,
    IConcurrencyLimiter concurrencyLimiter,
    IOptions<EngineSettings> engineSettings,
    TimeProvider timeProvider
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.StartingUp();

        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("MetricsCollector.Collect");
            activity?.DontRecord();

            try
            {
                var counts = await engineRepository.CountWorkflowsByStatus(stoppingToken);
                var active = SumStatuses(counts.ByStatus, PersistentItemStatusMap.Incomplete);
                var scheduled = counts.Scheduled;
                var failed = SumStatuses(counts.ByStatus, PersistentItemStatusMap.Failed);
                var successful = SumStatuses(counts.ByStatus, PersistentItemStatusMap.Successful);
                Metrics.SetActiveWorkflowsCount(active);
                Metrics.SetScheduledWorkflowsCount(scheduled);
                Metrics.SetFailedWorkflowsCount(failed);
                Metrics.SetSuccessfulWorkflowsCount(successful);
                Metrics.SetFinishedWorkflowsCount(failed + successful);

                Metrics.SetUsedInboxSlots(active);
                Metrics.SetAvailableInboxSlots(
                    Math.Max(0, engineSettings.Value.Concurrency.BackpressureThreshold - active)
                );

                engine.UpdateWorkflowCounts(active, scheduled, failed);

                Metrics.SetHealthStatus((long)engine.HealthLevel);

                var dbSlotStatus = concurrencyLimiter.DbSlotStatus;
                var httpSlotStatus = concurrencyLimiter.HttpSlotStatus;
                var workerSlotStatus = concurrencyLimiter.WorkerSlotStatus;
                Metrics.SetAvailableDbSlots(dbSlotStatus.Available);
                Metrics.SetUsedDbSlots(dbSlotStatus.Used);
                Metrics.SetAvailableHttpSlots(httpSlotStatus.Available);
                Metrics.SetUsedHttpSlots(httpSlotStatus.Used);
                Metrics.SetAvailableWorkerSlots(workerSlotStatus.Available);
                Metrics.SetUsedWorkerSlots(workerSlotStatus.Used);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Metrics.Errors.Add(1, ("operation", "metricsCollector"));
                logger.FailedToQueryCounts(ex.Message, ex);
            }

            await Task.Delay(engineSettings.Value.MetricsCollectionInterval, timeProvider, stoppingToken);
        }

        logger.ShuttingDown();
    }

    private static int SumStatuses(
        IReadOnlyDictionary<PersistentItemStatus, int> counts,
        IReadOnlyCollection<PersistentItemStatus> statuses
    ) => statuses.Sum(s => counts.GetValueOrDefault(s));
}

internal static partial class MetricsCollectorLogs
{
    [LoggerMessage(LogLevel.Information, "MetricsCollector starting")]
    public static partial void StartingUp(this ILogger<MetricsCollector> logger);

    [LoggerMessage(LogLevel.Error, "Failed to collect workflow counts: {ErrorMessage}")]
    public static partial void FailedToQueryCounts(
        this ILogger<MetricsCollector> logger,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "MetricsCollector shutting down")]
    public static partial void ShuttingDown(this ILogger<MetricsCollector> logger);
}
