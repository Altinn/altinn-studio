using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data.Constants;
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
    private static readonly TimeSpan _fallbackInterval = TimeSpan.FromMinutes(1);

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

                await FailPoisonWorkflows(now, settings, stoppingToken);
                await ReclaimStaleWorkflows(now, settings, stoppingToken);
                await RecoverDependencyResolvedWorkflows(now, stoppingToken);

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

            var interval = options.Value.MaintenanceInterval;
            await Task.Delay(interval > TimeSpan.Zero ? interval : _fallbackInterval, timeProvider, stoppingToken);
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
    internal async Task FailPoisonWorkflows(DateTimeOffset now, EngineSettings settings, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity("DbMaintenanceService.FailPoisonWorkflows");

        var staleDeadline = now - settings.StaleWorkflowThreshold;

        int failed;
        using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
        {
            await using var cmd = dataSource.CreateCommand(Sql.FailPoisonWorkflows);
            cmd.Parameters.AddWithValue("now", now);
            cmd.Parameters.AddWithValue("staleDeadline", staleDeadline);
            cmd.Parameters.AddWithValue("maxReclaimCount", settings.MaxReclaimCount);

            failed = await cmd.ExecuteNonQueryAsync(ct);
        }

        if (failed > 0)
        {
            Metrics.WorkflowsFailed.Add(failed, ("reason", "poison"));
            logger.FailedPoisonWorkflows(failed);
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

    /// <summary>
    /// Re-enqueues workflows stuck in <see cref="PersistentItemStatus.DependencyFailed"/> whose
    /// dependencies have since all reached <see cref="PersistentItemStatus.Completed"/>. The status
    /// is purely derived — a workflow lands there because a dependency was in a failed state when it
    /// was evaluated — so once every dependency completes (typically after the upstream was resumed
    /// without cascade) the original reason no longer holds and the workflow should run.
    /// A still-Canceled, still-Failed or Abandoned dependency keeps the workflow parked: a default
    /// dependency edge requires the upstream to <em>succeed</em>, and abandoning a workflow writes off
    /// its failure without ever satisfying that requirement — only an actual Completed does. (Abandoned
    /// differs from the others at <em>evaluation</em> time instead: it does not condemn dependents that
    /// have not yet been evaluated.) Deep chains heal one layer per sweep as each intermediate
    /// completes. Idempotent: re-enqueued rows no longer match the predicate.
    /// </summary>
    internal async Task RecoverDependencyResolvedWorkflows(DateTimeOffset now, CancellationToken ct)
    {
        using var activity = Metrics.Source.StartActivity("DbMaintenanceService.RecoverDependencyResolvedWorkflows");

        int recovered;
        using (await concurrencyLimiter.AcquireDbSlot(cancellationToken: ct))
        {
            await using var cmd = dataSource.CreateCommand(Sql.RecoverDependencyResolvedWorkflows);
            cmd.Parameters.AddWithValue("now", now);

            recovered = await cmd.ExecuteNonQueryAsync(ct);
        }

        if (recovered > 0)
        {
            Metrics.WorkflowsDependencyRecovered.Add(recovered);
            logger.RecoveredDependencyResolvedWorkflows(recovered);
        }
    }

    internal static class Sql
    {
        // Status lists interpolated as literals below all derive from PersistentItemStatusMap so
        // the candidate SELECT, the DELETE, and the ix_workflows_updated_at partial index filter
        // (see EngineDbContext) can never disagree about which statuses are terminal.
        private static readonly string _finishedStatuses = PersistentItemStatusMap.ToSqlList(
            PersistentItemStatusMap.Finished
        );

        private static readonly string _incompleteStatuses = PersistentItemStatusMap.ToSqlList(
            PersistentItemStatusMap.Incomplete
        );

        internal static readonly string SelectExpiredWorkflowCandidatesCommand = $"""
            SELECT w.id, w.collection_key, w.namespace
            FROM engine.workflows w
            WHERE w.id IN (
                SELECT candidate.id
                FROM engine.workflows candidate
                WHERE candidate.status IN ({_finishedStatuses})
                  AND candidate.updated_at < @cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_dependency dep
                      JOIN engine.workflows d ON dep.workflow_id = d.id
                      WHERE dep.depends_on_workflow_id = candidate.id
                        AND (d.status IN ({_incompleteStatuses}) OR d.updated_at >= @cutoff)
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_link lnk
                      JOIN engine.workflows l ON lnk.workflow_id = l.id
                      WHERE lnk.linked_workflow_id = candidate.id
                        AND (l.status IN ({_incompleteStatuses}) OR l.updated_at >= @cutoff)
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

        internal static readonly string DeleteExpiredWorkflowsCommand = $"""
            DELETE FROM engine.workflows
            WHERE id IN (
                SELECT w.id
                FROM engine.workflows w
                WHERE w.id = ANY(@workflowIds)
                  AND w.status IN ({_finishedStatuses})
                  AND w.updated_at < @cutoff
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_dependency dep
                      JOIN engine.workflows d ON dep.workflow_id = d.id
                      WHERE dep.depends_on_workflow_id = w.id
                        AND (d.status IN ({_incompleteStatuses}) OR d.updated_at >= @cutoff)
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM engine.workflow_link lnk
                      JOIN engine.workflows l ON lnk.workflow_id = l.id
                      WHERE lnk.linked_workflow_id = w.id
                        AND (l.status IN ({_incompleteStatuses}) OR l.updated_at >= @cutoff)
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

        internal static readonly string FailPoisonWorkflows = $"""
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

        // Reset matches the resume path's column set (LeaseToken cleared to preserve the
        // "NOT NULL iff Processing" invariant). Steps are left untouched: a DependencyFailed
        // workflow short-circuits before its steps run, so they remain pristine Enqueued.
        internal static readonly string RecoverDependencyResolvedWorkflows = $"""
            UPDATE engine.workflows w
            SET status = {(int)PersistentItemStatus.Enqueued},
                cancellation_requested_at = NULL,
                backoff_until = NULL,
                heartbeat_at = NULL,
                lease_token = NULL,
                reclaim_count = 0,
                updated_at = @now
            WHERE w.status = {(int)PersistentItemStatus.DependencyFailed}
              AND EXISTS (
                  SELECT 1 FROM engine.workflow_dependency wd
                  WHERE wd.workflow_id = w.id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM engine.workflow_dependency wd
                  JOIN engine.workflows dep ON dep.id = wd.depends_on_workflow_id
                  WHERE wd.workflow_id = w.id
                    AND dep.status <> {(int)PersistentItemStatus.Completed}
              )
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
        LogLevel.Information,
        "Recovered {Count} dependency-failed workflow(s) whose dependencies have since completed"
    )]
    internal static partial void RecoveredDependencyResolvedWorkflows(
        this ILogger<DbMaintenanceService> logger,
        int count
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed {Count} poison workflow(s) that exceeded the reclaim limit with a stale heartbeat"
    )]
    internal static partial void FailedPoisonWorkflows(this ILogger<DbMaintenanceService> logger, int count);
}
