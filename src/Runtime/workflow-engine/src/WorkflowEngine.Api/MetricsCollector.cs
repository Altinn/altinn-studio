using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api;

internal sealed class MetricsCollector(
    ILogger<MetricsCollector> logger,
    IEngine engine,
    IEngineRepository engineRepository,
    IConcurrencyLimiter concurrencyLimiter,
    TimeProvider timeProvider,
    IOptions<EngineSettings> engineSettings
) : BackgroundService
{
    private static readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan _retryTimeout = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.StartingUp();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var inboxCount = engine.InboxCount;
                var inboxLimit = engineSettings.Value.QueueCapacity;
                Telemetry.SetAvailableInboxSlots(inboxLimit - inboxCount);
                Telemetry.SetUsedInboxSlots(inboxCount);

                var active = await engineRepository.CountActiveWorkflows(cancellationToken: stoppingToken);
                var scheduled = await engineRepository.CountScheduledWorkflows(cancellationToken: stoppingToken);
                var failed = await engineRepository.CountFailedWorkflows(cancellationToken: stoppingToken);
                Telemetry.SetActiveWorkflowsCount(active);
                Telemetry.SetScheduledWorkflowsCount(scheduled);
                Telemetry.SetFailedWorkflowsCount(failed);

                var dbSlotStatus = concurrencyLimiter.DbSlotStatus;
                var httpSlotStatus = concurrencyLimiter.HttpSlotStatus;
                Telemetry.SetAvailableDbSlots(dbSlotStatus.Available);
                Telemetry.SetUsedDbSlots(dbSlotStatus.Used);
                Telemetry.SetAvailableHttpSlots(httpSlotStatus.Available);
                Telemetry.SetUsedHttpSlots(httpSlotStatus.Used);

                await Task.Delay(_pollInterval, timeProvider, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Telemetry.Errors.Add(1, ("operation", "metricsCollector"));
                logger.FailedToQueryCounts(ex.Message, ex);
                await Task.Delay(_retryTimeout, timeProvider, stoppingToken);
            }
        }

        logger.ShuttingDown();
    }
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
