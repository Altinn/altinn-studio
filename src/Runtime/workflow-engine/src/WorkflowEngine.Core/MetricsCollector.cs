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
    /// <summary>
    /// Where the overdue-mailbox count stops counting. High enough that no healthy or merely busy engine reaches
    /// it, low enough that the statement stays bounded during the mass timeout the gauge exists to report.
    /// </summary>
    private const int _overdueMailboxCountCap = 10_000;

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
                var waiting = counts.ByStatus.GetValueOrDefault(PersistentItemStatus.Waiting);
                var failed = SumStatuses(counts.ByStatus, PersistentItemStatusMap.Failed);
                var successful = SumStatuses(counts.ByStatus, PersistentItemStatusMap.Successful);
                Metrics.SetActiveWorkflowsCount(active);
                Metrics.SetScheduledWorkflowsCount(scheduled);
                Metrics.SetWaitingWorkflowsCount(waiting);
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

                // Deliberately the last thing the pass does: one try/catch covers the whole pass, so a read that threw
                // here would suppress every gauge written after it — including engine health. Ordered last, a failing
                // mailbox read costs this gauge alone.
                //

                // The grace is the sweep's own cadence: a mailbox whose deadline has just passed is one the sweep has
                // not had a tick to reach, and counting it would leave the gauge permanently non-zero on a healthy
                // engine. The count saturates because the alert reads "greater than zero" and this runs far more often
                // than the sweep.
                var overdueCutoff = timeProvider.GetUtcNow() - engineSettings.Value.MailboxSweepInterval;
                Metrics.SetOverdueOpenMailboxesCount(
                    await engineRepository.CountOverdueOpenMailboxes(
                        overdueCutoff,
                        _overdueMailboxCountCap,
                        stoppingToken
                    )
                );
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
    internal static partial void StartingUp(this ILogger<MetricsCollector> logger);

    [LoggerMessage(LogLevel.Error, "Failed to collect workflow counts: {ErrorMessage}")]
    internal static partial void FailedToQueryCounts(
        this ILogger<MetricsCollector> logger,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "MetricsCollector shutting down")]
    internal static partial void ShuttingDown(this ILogger<MetricsCollector> logger);
}
