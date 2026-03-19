using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// Dedicated background service that periodically sends heartbeats for all in-flight workflows.
/// Decoupled from <see cref="WorkflowProcessor"/> so heartbeats continue during shutdown drain.
/// </summary>
internal sealed class HeartbeatService(
    InFlightTracker tracker,
    IEngineRepository repo,
    IOptions<EngineSettings> settings,
    TimeProvider timeProvider,
    ILogger<HeartbeatService> logger
) : BackgroundService
{
    /// <summary>
    /// Extra grace period beyond <see cref="WorkflowProcessor.ShutdownTimeout"/> to prevent indefinite hangs.
    /// </summary>
    private static readonly TimeSpan _safetyMargin = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = settings.Value.HeartbeatInterval;
        var safetyTimeout = WorkflowProcessor.ShutdownTimeout + _safetyMargin;

        logger.HeartbeatServiceStarted(interval);

        // Safety CTS prevents indefinite hangs if the tracker never empties after shutdown.
        using var safetyCts = new CancellationTokenSource();
        CancellationTokenRegistration? safetyRegistration = null;

        try
        {
            while (!stoppingToken.IsCancellationRequested || !tracker.IsEmpty)
            {
                // Once shutdown is requested, arm the safety timeout so we don't hang forever.
                if (stoppingToken.IsCancellationRequested && safetyRegistration is null)
                {
                    safetyCts.CancelAfter(safetyTimeout);
                    safetyRegistration = safetyCts.Token.Register(logger.HeartbeatServiceSafetyTimeout);
                }

                var token = stoppingToken.IsCancellationRequested ? safetyCts.Token : stoppingToken;

                try
                {
                    await Task.Delay(interval, timeProvider, token);
                }
                catch (OperationCanceledException) when (safetyCts.IsCancellationRequested)
                {
                    break;
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // stoppingToken fired — continue the loop to check tracker.IsEmpty
                    continue;
                }

                if (tracker.IsEmpty)
                    continue;

                try
                {
                    var ids = tracker.GetSnapshotIds();
                    await repo.BatchUpdateHeartbeats(ids, safetyCts.Token);
                    logger.HeartbeatSweepCompleted(ids.Count);
                }
                catch (OperationCanceledException) when (safetyCts.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.HeartbeatSweepFailed(ex);
                }
            }
        }
        finally
        {
            if (safetyRegistration is { } reg)
                await reg.DisposeAsync();
        }

        logger.HeartbeatServiceStopped();
    }
}

internal static partial class HeartbeatServiceLogs
{
    [LoggerMessage(LogLevel.Information, "HeartbeatService started (interval={Interval})")]
    internal static partial void HeartbeatServiceStarted(this ILogger<HeartbeatService> logger, TimeSpan interval);

    [LoggerMessage(LogLevel.Debug, "Heartbeat sweep completed for {Count} workflows")]
    internal static partial void HeartbeatSweepCompleted(this ILogger<HeartbeatService> logger, int count);

    [LoggerMessage(LogLevel.Warning, "Heartbeat sweep failed — in-flight workflows may appear stale")]
    internal static partial void HeartbeatSweepFailed(this ILogger<HeartbeatService> logger, Exception ex);

    [LoggerMessage(LogLevel.Warning, "HeartbeatService safety timeout expired — exiting despite non-empty tracker")]
    internal static partial void HeartbeatServiceSafetyTimeout(this ILogger<HeartbeatService> logger);

    [LoggerMessage(LogLevel.Information, "HeartbeatService stopped")]
    internal static partial void HeartbeatServiceStopped(this ILogger<HeartbeatService> logger);
}
