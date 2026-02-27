using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

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
            using var activity = Metrics.Source.StartActivity("MetricsCollector.Collect");
            activity?.DontRecord();

            try
            {
                var inboxCount = engine.InboxCount;
                var inboxLimit = engineSettings.Value.QueueCapacity;
                Metrics.SetAvailableInboxSlots(inboxLimit - inboxCount);
                Metrics.SetUsedInboxSlots(inboxCount);

                var active = await engineRepository.CountActiveWorkflows(cancellationToken: stoppingToken);
                var scheduled = await engineRepository.CountScheduledWorkflows(cancellationToken: stoppingToken);
                var failed = await engineRepository.CountFailedWorkflows(cancellationToken: stoppingToken);
                Metrics.SetActiveWorkflowsCount(active);
                Metrics.SetScheduledWorkflowsCount(scheduled);
                Metrics.SetFailedWorkflowsCount(failed);

                var dbSlotStatus = concurrencyLimiter.DbSlotStatus;
                var httpSlotStatus = concurrencyLimiter.HttpSlotStatus;
                Metrics.SetAvailableDbSlots(dbSlotStatus.Available);
                Metrics.SetUsedDbSlots(dbSlotStatus.Used);
                Metrics.SetAvailableHttpSlots(httpSlotStatus.Available);
                Metrics.SetUsedHttpSlots(httpSlotStatus.Used);

                await Task.Delay(_pollInterval, timeProvider, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Metrics.Errors.Add(1, ("operation", "metricsCollector"));
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
