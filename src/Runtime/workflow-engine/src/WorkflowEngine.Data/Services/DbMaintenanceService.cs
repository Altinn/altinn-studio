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
                deleted = await PurgeExpiredWorkflowBatch(now, cutoff, settings.BatchSize, ct);
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
                    "ANALYZE engine.workflows, engine.steps, engine.workflow_dependency, engine.workflow_collections, engine.idempotency_keys"
                );
                await analyzeCmd.ExecuteNonQueryAsync(ct);
            }
        }
    }

    private async Task<int> PurgeExpiredWorkflowBatch(
        DateTimeOffset now,
        DateTimeOffset cutoff,
        int batchSize,
        CancellationToken ct
    )
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        // Discover candidate collection keys without locking workflows first. Enqueue locks the
        // collection before adding dependencies to heads; taking workflow locks first here would
        // invert that order and could deadlock with a concurrent enqueue.
        var candidates = await SelectExpiredWorkflowCandidates(conn, tx, cutoff, batchSize, ct);
        if (candidates.Count == 0)
        {
            await tx.CommitAsync(ct);
            return 0;
        }

        var collectionKeys = new List<(string Key, string Namespace)>();
        foreach (var candidate in candidates)
        {
            if (candidate.CollectionKey is { } collectionKey)
            {
                collectionKeys.Add((collectionKey, candidate.Namespace));
            }
        }

        var distinctCollectionKeys = collectionKeys
            .Distinct()
            .OrderBy(collection => collection.Key)
            .ThenBy(collection => collection.Namespace)
            .ToArray();

        await LockWorkflowCollections(conn, tx, distinctCollectionKeys, ct);

        var deletedWorkflows = await DeleteExpiredWorkflows(
            conn,
            tx,
            [.. candidates.Select(candidate => candidate.Id)],
            cutoff,
            ct
        );
        if (deletedWorkflows.Count == 0)
        {
            await tx.CommitAsync(ct);
            return 0;
        }

        await PruneWorkflowCollectionHeads(conn, tx, deletedWorkflows, now, ct);
        await DeleteUnreferencedWorkflowCollections(conn, tx, distinctCollectionKeys, ct);

        await tx.CommitAsync(ct);
        return deletedWorkflows.Count;
    }

    private static async Task<List<WorkflowPurgeCandidate>> SelectExpiredWorkflowCandidates(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        DateTimeOffset cutoff,
        int batchSize,
        CancellationToken ct
    )
    {
        await using var cmd = new NpgsqlCommand(Sql.SelectExpiredWorkflowCandidatesCommand, conn, tx);
        cmd.Parameters.AddWithValue("cutoff", cutoff);
        cmd.Parameters.AddWithValue("batchSize", batchSize);

        var candidates = new List<WorkflowPurgeCandidate>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
#pragma warning disable CA1849, S6966
            var id = reader.GetFieldValue<Guid>(0);
            var collectionKey = reader.IsDBNull(1) ? null : reader.GetFieldValue<string>(1);
            var ns = reader.GetFieldValue<string>(2);
#pragma warning restore CA1849, S6966
            candidates.Add(new WorkflowPurgeCandidate(id, collectionKey, ns));
        }

        return candidates;
    }

    private static async Task LockWorkflowCollections(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (string Key, string Namespace)[] collectionKeys,
        CancellationToken ct
    )
    {
        if (collectionKeys.Length == 0)
        {
            return;
        }

        var (keys, namespaces) = collectionKeys.Unzip();
        await using var cmd = new NpgsqlCommand(Sql.LockWorkflowCollectionsCommand, conn, tx);
        cmd.Parameters.AddWithValue("keys", keys);
        cmd.Parameters.AddWithValue("namespaces", namespaces);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task<List<DeletedWorkflow>> DeleteExpiredWorkflows(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid[] candidateIds,
        DateTimeOffset cutoff,
        CancellationToken ct
    )
    {
        await using var cmd = new NpgsqlCommand(Sql.DeleteExpiredWorkflowsCommand, conn, tx);
        cmd.Parameters.AddWithValue("workflowIds", candidateIds);
        cmd.Parameters.AddWithValue("cutoff", cutoff);

        var deletedWorkflows = new List<DeletedWorkflow>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
#pragma warning disable CA1849, S6966
            var id = reader.GetFieldValue<Guid>(0);
            var collectionKey = reader.IsDBNull(1) ? null : reader.GetFieldValue<string>(1);
            var ns = reader.GetFieldValue<string>(2);
#pragma warning restore CA1849, S6966
            deletedWorkflows.Add(new DeletedWorkflow(id, collectionKey, ns));
        }

        return deletedWorkflows;
    }

    private static async Task PruneWorkflowCollectionHeads(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        List<DeletedWorkflow> deletedWorkflows,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var collectionDeletes = new List<(string Key, string Namespace, Guid Id)>();
        foreach (var workflow in deletedWorkflows)
        {
            if (workflow.CollectionKey is { } collectionKey)
            {
                collectionDeletes.Add((collectionKey, workflow.Namespace, workflow.Id));
            }
        }

        if (collectionDeletes.Count == 0)
            return;

        var (keys, namespaces, workflowIds) = collectionDeletes.ToArray().Unzip();
        await using var cmd = new NpgsqlCommand(Sql.PruneWorkflowCollectionHeadsCommand, conn, tx);
        cmd.Parameters.AddWithValue("keys", keys);
        cmd.Parameters.AddWithValue("namespaces", namespaces);
        cmd.Parameters.AddWithValue("workflowIds", workflowIds);
        cmd.Parameters.AddWithValue("now", now);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task DeleteUnreferencedWorkflowCollections(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (string Key, string Namespace)[] collectionKeys,
        CancellationToken ct
    )
    {
        if (collectionKeys.Length == 0)
            return;

        var (keys, namespaces) = collectionKeys.Unzip();
        await using var cmd = new NpgsqlCommand(Sql.DeleteUnreferencedWorkflowCollectionsCommand, conn, tx);
        cmd.Parameters.AddWithValue("keys", keys);
        cmd.Parameters.AddWithValue("namespaces", namespaces);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    private sealed record WorkflowPurgeCandidate(Guid Id, string? CollectionKey, string Namespace);

    private sealed record DeletedWorkflow(Guid Id, string? CollectionKey, string Namespace);

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
        internal const string SelectExpiredWorkflowCandidatesCommand = """
            SELECT w.id, w.collection_key, w.namespace
            FROM engine.workflows w
            WHERE w.id IN (
                SELECT candidate.id
                FROM engine.workflows candidate
                WHERE candidate.status IN (3, 4, 5, 6)
                  AND candidate.updated_at < @cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_dependency dep
                      JOIN engine.workflows d ON dep.workflow_id = d.id
                      WHERE dep.depends_on_workflow_id = candidate.id
                        AND (d.status IN (0, 1, 2) OR d.updated_at >= @cutoff)
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_link lnk
                      JOIN engine.workflows l ON lnk.workflow_id = l.id
                      WHERE lnk.linked_workflow_id = candidate.id
                        AND (l.status IN (0, 1, 2) OR l.updated_at >= @cutoff)
                  )
                LIMIT @batchSize
            )
            LIMIT @batchSize
            """;

        internal const string LockWorkflowCollectionsCommand = """
            SELECT wc.key, wc.namespace
            FROM unnest(@keys, @namespaces) AS t(key, namespace)
            JOIN engine.workflow_collections wc USING (key, namespace)
            ORDER BY wc.key, wc.namespace
            FOR UPDATE
            """;

        internal const string PruneWorkflowCollectionHeadsCommand = """
            WITH deleted AS (
                SELECT key, namespace, array_agg(workflow_id) AS workflow_ids
                FROM unnest(@keys, @namespaces, @workflowIds) AS t(key, namespace, workflow_id)
                GROUP BY key, namespace
            )
            UPDATE engine.workflow_collections AS wc
            SET heads = ARRAY(
                    SELECT head
                    FROM unnest(wc.heads) AS heads(head)
                    WHERE NOT (head = ANY(deleted.workflow_ids))
                ),
                updated_at = @now
            FROM deleted
            WHERE wc.key = deleted.key
              AND wc.namespace = deleted.namespace
              AND wc.heads && deleted.workflow_ids
            """;

        internal const string DeleteUnreferencedWorkflowCollectionsCommand = """
            DELETE FROM engine.workflow_collections AS wc
            USING unnest(@keys, @namespaces) AS t(key, namespace)
            WHERE wc.key = t.key
              AND wc.namespace = t.namespace
              AND NOT EXISTS (
                  SELECT 1
                  FROM engine.workflows w
                  WHERE w.collection_key = wc.key
                    AND w.namespace = wc.namespace
              )
            """;

        internal const string DeleteExpiredWorkflowsCommand = """
            DELETE FROM engine.workflows
            WHERE id IN (
                SELECT w.id
                FROM engine.workflows w
                WHERE w.id = ANY(@workflowIds)
                  AND w.status IN (3, 4, 5, 6)
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
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, collection_key, namespace
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
