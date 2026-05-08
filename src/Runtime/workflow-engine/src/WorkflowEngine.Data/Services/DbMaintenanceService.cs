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
                var settings = options.Value;

                if (now - _lastRetentionRun >= settings.Retention.Interval)
                {
                    _lastRetentionRun = now;
                    await PurgeExpiredWorkflows(now, settings.Retention, stoppingToken);
                }

                await AbandonStaleWorkflows(now, settings, stoppingToken);
                await ReclaimStaleWorkflows(now, settings, stoppingToken);

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
                    "ANALYZE engine.workflows, engine.steps, engine.workflow_dependency, engine.idempotency_keys"
                );
                await analyzeCmd.ExecuteNonQueryAsync(ct);
            }
        }
    }

    /// <summary>
    /// Finalizes poison workflows — rows that have exceeded <see cref="EngineSettings.MaxReclaimCount"/>
    /// and whose heartbeat is stale — by marking them as <see cref="PersistentItemStatus.Failed"/>
    /// and clearing LeaseToken. Idempotent across concurrent sweeps from multiple pods:
    /// a zombie worker that completes the row before this sweep lands will transition it out
    /// of Processing, causing the WHERE clause to skip it.
    /// </summary>
    internal async Task AbandonStaleWorkflows(DateTimeOffset now, EngineSettings settings, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity("DbMaintenanceService.AbandonStaleWorkflows");

        var staleDeadline = now - settings.StaleWorkflowThreshold;

        int abandoned;
        using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
        {
            await using var cmd = dataSource.CreateCommand(Sql.AbandonStaleWorkflows);
            cmd.Parameters.AddWithValue("now", now);
            cmd.Parameters.AddWithValue("staleDeadline", staleDeadline);
            cmd.Parameters.AddWithValue("maxReclaimCount", settings.MaxReclaimCount);

            abandoned = await cmd.ExecuteNonQueryAsync(ct);
        }

        if (abandoned > 0)
        {
            Metrics.WorkflowsFailed.Add(abandoned, ("reason", "poison"));
            logger.AbandonedStaleWorkflows(abandoned);
        }
    }

    /// <summary>
    /// Reclaims stale <see cref="PersistentItemStatus.Processing"/> rows whose owning worker has
    /// gone silent, by resetting them to <see cref="PersistentItemStatus.Enqueued"/> and bumping
    /// ReclaimCount. The next fetch cycle picks them up like any enqueued workflow.
    /// Idempotent: rows already reclaimed (no longer Processing) are skipped.
    /// </summary>
    internal async Task ReclaimStaleWorkflows(DateTimeOffset now, EngineSettings settings, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity("DbMaintenanceService.ReclaimStaleWorkflows");

        var staleDeadline = now - settings.StaleWorkflowThreshold;

        int reclaimed;
        using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
        {
            await using var cmd = dataSource.CreateCommand(Sql.ReclaimStaleWorkflows);
            cmd.Parameters.AddWithValue("now", now);
            cmd.Parameters.AddWithValue("staleDeadline", staleDeadline);
            cmd.Parameters.AddWithValue("maxReclaimCount", settings.MaxReclaimCount);

            reclaimed = await cmd.ExecuteNonQueryAsync(ct);
        }

        if (reclaimed > 0)
        {
            Metrics.WorkflowsReclaimed.Add(reclaimed);
            logger.ReclaimedStaleWorkflows(reclaimed);
        }
    }

    internal static class Sql
    {
        internal const string PurgeExpiredWorkflows = """
            DELETE FROM engine.workflows
            WHERE id IN (
                SELECT w.id
                FROM engine.workflows w
                WHERE w.status IN (3, 4, 5, 6)
                  AND w.updated_at < @cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_dependency dep
                      JOIN engine.workflows d ON dep.workflow_id = d.id
                      WHERE dep.depends_on_workflow_id = w.id
                        AND (d.status IN (0, 1, 2) OR d.updated_at >= @cutoff)
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_link lnk
                      JOIN engine.workflows l ON lnk.workflow_id = l.id
                      WHERE lnk.linked_workflow_id = w.id
                        AND (l.status IN (0, 1, 2) OR l.updated_at >= @cutoff)
                  )
                LIMIT @batchSize
                FOR UPDATE SKIP LOCKED
            )
            """;

        internal const string DeleteOrphanedIdempotencyKeys = """
            DELETE FROM engine.idempotency_keys
            WHERE created_at < @cutoff
              AND NOT EXISTS (
                  SELECT 1 FROM engine.workflows w
                  WHERE w.id = ANY(workflow_ids)
              )
            """;

        internal static readonly string AbandonStaleWorkflows = $"""
            UPDATE engine.workflows
            SET status = {(int)PersistentItemStatus.Failed},
                updated_at = @now,
                heartbeat_at = NULL,
                lease_token = NULL
            WHERE status = {(int)PersistentItemStatus.Processing}
              AND heartbeat_at IS NOT NULL
              AND heartbeat_at < @staleDeadline
              AND reclaim_count >= @maxReclaimCount
            """;

        internal static readonly string ReclaimStaleWorkflows = $"""
            UPDATE engine.workflows
            SET status = {(int)PersistentItemStatus.Enqueued},
                updated_at = @now,
                heartbeat_at = NULL,
                lease_token = NULL,
                reclaim_count = reclaim_count + 1
            WHERE status = {(int)PersistentItemStatus.Processing}
              AND heartbeat_at IS NOT NULL
              AND heartbeat_at < @staleDeadline
              AND reclaim_count < @maxReclaimCount
            """;
    }
}

internal static partial class DbMaintenanceServiceLogs
{
    [LoggerMessage(LogLevel.Information, "DbMaintenanceService starting")]
    internal static partial void StartingUp(this ILogger<DbMaintenanceService> logger);

    [LoggerMessage(
        LogLevel.Error,
        "Database maintenance failed (attempt {ConsecutiveFailures}, backing off {Delay}): {ErrorMessage}"
    )]
    internal static partial void MaintenanceFailed(
        this ILogger<DbMaintenanceService> logger,
        int consecutiveFailures,
        TimeSpan delay,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Information, "DbMaintenanceService shutting down")]
    internal static partial void ShuttingDown(this ILogger<DbMaintenanceService> logger);

    [LoggerMessage(LogLevel.Information, "Retention: deleted {Count} terminal workflow(s)")]
    internal static partial void RetentionDeletedWorkflows(this ILogger<DbMaintenanceService> logger, int count);

    [LoggerMessage(LogLevel.Information, "Retention: deleted {Count} orphaned idempotency key(s)")]
    internal static partial void RetentionDeletedKeys(this ILogger<DbMaintenanceService> logger, int count);

    [LoggerMessage(LogLevel.Warning, "Reclaimed {Count} stale workflows from crashed/unresponsive workers")]
    internal static partial void ReclaimedStaleWorkflows(this ILogger<DbMaintenanceService> logger, int count);

    [LoggerMessage(
        LogLevel.Error,
        "Abandoned {Count} stale workflows that exceeded the reclaim limit — marked as Failed"
    )]
    internal static partial void AbandonedStaleWorkflows(this ILogger<DbMaintenanceService> logger, int count);
}
