using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// Background service that polls for cross-pod cancellation signals.
/// On each tick, checks whether any in-flight workflows on this pod have been
/// flagged for cancellation in the database (e.g. by a cancel API call hitting another pod).
/// </summary>
internal sealed class CancellationWatcherService(
    InFlightTracker tracker,
    IEngineRepository repo,
    IOptions<EngineSettings> settings,
    ILogger<CancellationWatcherService> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = settings.Value.CancellationWatcherInterval;

        logger.CancellationWatcherStarted(interval);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(interval, stoppingToken);

                if (tracker.IsEmpty)
                    continue;

                try
                {
                    var inFlightIds = tracker.GetSnapshotIds();
                    var pendingCancellations = await repo.GetPendingCancellations(inFlightIds, stoppingToken);

                    if (pendingCancellations.Count > 0)
                    {
                        logger.CancellationWatcherCancelling(pendingCancellations.Count);
                        tracker.TryCancel(pendingCancellations);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    logger.CancellationWatcherError(ex);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected on shutdown
        }

        logger.CancellationWatcherStopped();
    }
}

internal static partial class CancellationWatcherServiceLogs
{
    [LoggerMessage(LogLevel.Information, "CancellationWatcherService started (interval={Interval})")]
    internal static partial void CancellationWatcherStarted(
        this ILogger<CancellationWatcherService> logger,
        TimeSpan interval
    );

    [LoggerMessage(LogLevel.Information, "CancellationWatcherService triggering cancellation for {Count} workflows")]
    internal static partial void CancellationWatcherCancelling(
        this ILogger<CancellationWatcherService> logger,
        int count
    );

    [LoggerMessage(LogLevel.Error, "CancellationWatcherService encountered an error")]
    internal static partial void CancellationWatcherError(
        this ILogger<CancellationWatcherService> logger,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "CancellationWatcherService stopped")]
    internal static partial void CancellationWatcherStopped(this ILogger<CancellationWatcherService> logger);
}
