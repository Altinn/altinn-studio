using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Services;

internal sealed class DbMaintenanceService(
    ILogger<DbMaintenanceService> logger,
    TimeProvider timeProvider,
    NpgsqlDataSource dataSource,
    IOptions<EngineSettings> options,
    IConcurrencyLimiter concurrencyLimiter
) : BackgroundService
{
    private static readonly TimeSpan _interval = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Backoff strategy used when database operations fail. Exponential from 1s up to 2min.
    /// </summary>
    private static readonly RetryStrategy _databaseBackoff = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(2)
    );

    private DateTimeOffset _lastRetentionRun = DateTimeOffset.MinValue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.StartingUp();

        int consecutiveFailures = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("DbMaintenanceService.Run");
            activity?.DontRecord();

            try
            {
                var now = timeProvider.GetUtcNow();
                var settings = options.Value.Retention;

                if (now - _lastRetentionRun >= settings.Interval)
                {
                    _lastRetentionRun = now;
                    await PurgeExpiredWorkflows(now, settings, stoppingToken);
                }

                consecutiveFailures = 0;
                Metrics.SetMaintenanceConsecutiveFailures(0);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                consecutiveFailures++;
                Metrics.SetMaintenanceConsecutiveFailures(consecutiveFailures);
                Metrics.Errors.Add(1, ("operation", "dbMaintenance"));
                activity?.Errored(ex);

                var delay = _databaseBackoff.CalculateDelay(consecutiveFailures);
                logger.MaintenanceFailed(consecutiveFailures, delay, ex.Message, ex);

                await Task.Delay(delay, timeProvider, stoppingToken);
                continue;
            }

            await Task.Delay(_interval, timeProvider, stoppingToken);
        }

        logger.ShuttingDown();
    }

    internal async Task PurgeExpiredWorkflows(DateTimeOffset now, RetentionSettings settings, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity("DbMaintenanceService.PurgeExpiredWorkflows");

        var cutoff = now - settings.RetentionPeriod;
        var totalDeletedWorkflows = 0;

        // Delete terminal workflows in batches until all eligible rows are drained.
        int deleted;
        do
        {
            using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
            {
                await using var workflowCmd = dataSource.CreateCommand(Sql.PurgeExpiredWorkflows);
                workflowCmd.Parameters.AddWithValue("cutoff", cutoff);
                workflowCmd.Parameters.AddWithValue("batchSize", settings.BatchSize);

                deleted = await workflowCmd.ExecuteNonQueryAsync(ct);
                totalDeletedWorkflows += deleted;
            }
        } while (deleted >= settings.BatchSize);

        if (totalDeletedWorkflows > 0)
            logger.RetentionDeletedWorkflows(totalDeletedWorkflows);

        // Clean up orphaned idempotency keys whose workflows have all been deleted.
        int deletedKeys;
        using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
        {
            await using var keyCmd = dataSource.CreateCommand(Sql.DeleteOrphanedIdempotencyKeys);
            keyCmd.Parameters.AddWithValue("cutoff", cutoff);

            deletedKeys = await keyCmd.ExecuteNonQueryAsync(ct);
            if (deletedKeys > 0)
                logger.RetentionDeletedKeys(deletedKeys);
        }

        // Refresh query planner statistics after bulk deletes so index/scan choices stay optimal.
        if (totalDeletedWorkflows > 0 || deletedKeys > 0)
        {
            using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
            {
                await using var analyzeCmd = dataSource.CreateCommand(
                    """ANALYZE engine."Workflows", engine."Steps", engine."IdempotencyKeys" """
                );
                await analyzeCmd.ExecuteNonQueryAsync(ct);
            }
        }
    }

    internal static class Sql
    {
        internal const string PurgeExpiredWorkflows = """
            DELETE FROM engine."Workflows"
            WHERE "Id" IN (
                SELECT w."Id"
                FROM engine."Workflows" w
                WHERE w."Status" IN (3, 4, 5, 6)
                  AND w."UpdatedAt" < @cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM engine."WorkflowDependency" dep
                      JOIN engine."Workflows" d ON dep."WorkflowId" = d."Id"
                      WHERE dep."DependsOnWorkflowId" = w."Id"
                        AND (d."Status" IN (0, 1, 2) OR d."UpdatedAt" >= @cutoff)
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM engine."WorkflowLink" lnk
                      JOIN engine."Workflows" l ON lnk."WorkflowId" = l."Id"
                      WHERE lnk."LinkedWorkflowId" = w."Id"
                        AND (l."Status" IN (0, 1, 2) OR l."UpdatedAt" >= @cutoff)
                  )
                LIMIT @batchSize
                FOR UPDATE SKIP LOCKED
            )
            """;

        internal const string DeleteOrphanedIdempotencyKeys = """
            DELETE FROM engine."IdempotencyKeys"
            WHERE "CreatedAt" < @cutoff
              AND NOT EXISTS (
                  SELECT 1 FROM engine."Workflows" w
                  WHERE w."Id" = ANY("WorkflowIds")
              )
            """;
    }
}

internal static partial class DbMaintenanceServiceLogs
{
    [LoggerMessage(LogLevel.Information, "DbMaintenanceService starting")]
    public static partial void StartingUp(this ILogger<DbMaintenanceService> logger);

    [LoggerMessage(
        LogLevel.Error,
        "Database maintenance failed (attempt {ConsecutiveFailures}, backing off {Delay}): {ErrorMessage}"
    )]
    public static partial void MaintenanceFailed(
        this ILogger<DbMaintenanceService> logger,
        int consecutiveFailures,
        TimeSpan delay,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "DbMaintenanceService shutting down")]
    public static partial void ShuttingDown(this ILogger<DbMaintenanceService> logger);

    [LoggerMessage(LogLevel.Information, "Retention: deleted {Count} terminal workflow(s)")]
    public static partial void RetentionDeletedWorkflows(this ILogger<DbMaintenanceService> logger, int count);

    [LoggerMessage(LogLevel.Information, "Retention: deleted {Count} orphaned idempotency key(s)")]
    public static partial void RetentionDeletedKeys(this ILogger<DbMaintenanceService> logger, int count);
}
