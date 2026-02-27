using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Services;

public sealed class DbMaintenanceService(ILogger<DbMaintenanceService> logger, TimeProvider timeProvider)
    : BackgroundService
{
    private static readonly TimeSpan _interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.StartingUp();

        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("DbMaintenanceService.Run");
            activity?.DontRecord();

            try
            {
                // TODO: Add maintenance tasks here (e.g. cascade_dependency_failures)??
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Metrics.Errors.Add(1, ("operation", "dbMaintenance"));
                logger.MaintenanceFailed(ex.Message, ex);
                activity?.Errored(ex);
            }

            await Task.Delay(_interval, timeProvider, stoppingToken);
        }

        logger.ShuttingDown();
    }
}

internal static partial class DbMaintenanceServiceLogs
{
    [LoggerMessage(LogLevel.Information, "DbMaintenanceService starting")]
    public static partial void StartingUp(this ILogger<DbMaintenanceService> logger);

    [LoggerMessage(LogLevel.Error, "Database maintenance failed: {ErrorMessage}")]
    public static partial void MaintenanceFailed(
        this ILogger<DbMaintenanceService> logger,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "DbMaintenanceService shutting down")]
    public static partial void ShuttingDown(this ILogger<DbMaintenanceService> logger);
}
