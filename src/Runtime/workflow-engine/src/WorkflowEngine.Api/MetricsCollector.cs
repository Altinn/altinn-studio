using WorkflowEngine.Api.Constants;
using WorkflowEngine.Data.Repository;

namespace WorkflowEngine.Api;

internal sealed class MetricsCollector(
    ILogger<MetricsCollector> logger,
    IEngineRepository engineRepository,
    TimeProvider timeProvider
) : BackgroundService
{
    private static readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan _retryTimeout = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.StartingUp();

        while (!stoppingToken.IsCancellationRequested)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var active = await engineRepository.CountActiveWorkflows(stoppingToken);
                    var scheduled = await engineRepository.CountScheduledWorkflows(stoppingToken);
                    var failed = await engineRepository.CountFailedWorkflows(stoppingToken);
                    Telemetry.SetActiveWorkflowsCount(active);
                    Telemetry.SetScheduledWorkflowsCount(scheduled);
                    Telemetry.SetFailedWorkflowsCount(failed);

                    await Task.Delay(_pollInterval, timeProvider, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    logger.FailedToQueryCounts(ex.Message, ex);
                    await Task.Delay(_retryTimeout, timeProvider, stoppingToken);
                }
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
