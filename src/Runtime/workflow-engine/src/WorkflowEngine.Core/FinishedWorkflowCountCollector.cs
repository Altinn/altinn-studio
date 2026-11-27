using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Feeds the failed, successful and finished gauges and the engine's failed count from a read of every workflow the
/// database retains. Its own loop, so that read never holds up the active counts backpressure runs on in
/// <see cref="MetricsCollector"/>.
/// </summary>
internal sealed class FinishedWorkflowCountCollector(
    ILogger<FinishedWorkflowCountCollector> logger,
    IEngineStatus engine,
    IEngineRepository engineRepository,
    IOptions<EngineSettings> engineSettings,
    TimeProvider timeProvider
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("FinishedWorkflowCountCollector.Collect");
            activity?.DontRecord();

            try
            {
                var counts = await engineRepository.CountWorkflowsByStatus(stoppingToken);
                var failed = PersistentItemStatusMap.Failed.Sum(s => counts.GetValueOrDefault(s));
                var successful = PersistentItemStatusMap.Successful.Sum(s => counts.GetValueOrDefault(s));
                Metrics.SetFailedWorkflowsCount(failed);
                Metrics.SetSuccessfulWorkflowsCount(successful);
                Metrics.SetFinishedWorkflowsCount(failed + successful);

                engine.UpdateFailedWorkflowCount(failed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Metrics.Errors.Add(1, (TelemetryAttributes.Operation, "metrics_collector"));
                logger.FailedToCountFinishedWorkflows(ex.Message, ex);
            }

            await Task.Delay(engineSettings.Value.FinishedWorkflowCountCollectionInterval, timeProvider, stoppingToken);
        }
    }
}

internal static partial class FinishedWorkflowCountCollectorLogs
{
    [LoggerMessage(LogLevel.Error, "Failed to count the finished workflows: {ErrorMessage}")]
    internal static partial void FailedToCountFinishedWorkflows(
        this ILogger<FinishedWorkflowCountCollector> logger,
        string errorMessage,
        Exception ex
    );
}
