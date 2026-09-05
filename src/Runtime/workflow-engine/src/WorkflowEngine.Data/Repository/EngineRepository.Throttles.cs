using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

// NpgsqlDbType.Array is designed to be bitwise-OR'd with element types (e.g. Array | Text),
// but the enum is not marked [Flags], causing a false positive from SonarAnalyzer.
#pragma warning disable S3265 // Non-flags enums should not be used in bitwise operations

namespace WorkflowEngine.Data.Repository;

/// <summary>
/// Repository surface of the namespace throttle sweep (failure-storm circuit breaker).
/// All methods here are called from <c>NamespaceThrottleService</c> only; consistency with that
/// service's design is documented on <see cref="IEngineRepository"/>. Unlike most write paths in
/// this repository, these methods carry no per-operation retry: the sweep is periodic and applies
/// its own failure backoff at cycle level (the <c>DbMaintenanceService</c> house pattern), and
/// retrying inside a cycle would only stretch the time the sweep's advisory lock is held.
/// </summary>
internal sealed partial class EngineRepository
{
    // Every statement in this file interpolates its status literals from PersistentItemStatusMap
    // constants, which tests pin to the map properties, so none of them can drift from the status
    // sets — the same contract as DbMaintenanceService.Sql. The two fragments below are the pieces
    // more than one statement shares; the rest sit with the method that runs them.

    private const string RequeuedLiteral = PersistentItemStatusMap.RequeuedSqlLiteral;

    /// <summary>
    /// The current step (first non-terminal by processing order) of each candidate workflow,
    /// as a reusable lateral fragment. A <c>Requeued</c> workflow always has one — it is the
    /// step that failed.
    /// </summary>
    private const string CurrentStepLateral = $"""
        SELECT st.requeue_count, st.retry_strategy_json, st.last_deferred_at, st.created_at, st.processing_order
                FROM engine.steps st
                WHERE st.job_id = w.id
                  AND st.status NOT IN ({PersistentItemStatusMap.FinishedSqlList})
                ORDER BY st.processing_order
                LIMIT 1
        """;

    /// <summary>
    /// One GROUP BY over the <c>ix_workflows_namespace_status_incomplete</c> partial index:
    /// per-namespace Requeued and active counts, reading no column the index does not carry.
    /// Whether the planner spends that as an index-only scan or a bitmap scan with a heap
    /// recheck is its own call — it varies with visibility-map state, and has been seen to
    /// differ between two runs on one machine — so the plan test pins the index, not the node.
    /// Hoisted for <c>QueryPlanTests</c>.
    /// </summary>
    internal const string NamespaceWorkflowCountsSql = $"""
        SELECT namespace,
               (COUNT(*) FILTER (WHERE status = {RequeuedLiteral}))::int AS requeued,
               COUNT(*)::int AS active
        FROM engine.workflows
        WHERE status IN ({PersistentItemStatusMap.IncompleteSqlList})
        GROUP BY namespace
        """;

    /// <inheritdoc/>
    public async Task<IReadOnlyList<NamespaceWorkflowCounts>> GetNamespaceWorkflowCounts(
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetNamespaceWorkflowCounts");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(NamespaceWorkflowCountsSql);

        var counts = new List<NamespaceWorkflowCounts>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966 // Synchronous GetFieldValue is intentional - data is already buffered after ReadAsync
            counts.Add(new NamespaceWorkflowCounts(reader.GetString(0), reader.GetInt32(1), reader.GetInt32(2)));
#pragma warning restore CA1849, S6966
        }

        return counts;
    }

    /// <summary>
    /// Same counts for one namespace, excluding rows parked behind a future
    /// <c>throttled_until</c> — the recovery re-trip signal.
    /// </summary>
    internal const string UnparkedNamespaceWorkflowCountsSql = $"""
        SELECT (COUNT(*) FILTER (WHERE status = {RequeuedLiteral}))::int AS requeued,
               COUNT(*)::int AS active
        FROM engine.workflows
        WHERE namespace = @ns
          AND status IN ({PersistentItemStatusMap.IncompleteSqlList})
          AND (throttled_until IS NULL OR throttled_until <= @now)
        """;

    /// <inheritdoc/>
    public async Task<NamespaceWorkflowCounts> GetUnparkedNamespaceWorkflowCounts(
        string ns,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetUnparkedNamespaceWorkflowCounts");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(UnparkedNamespaceWorkflowCountsSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
#pragma warning disable CA1849, S6966
        return new NamespaceWorkflowCounts(ns, reader.GetInt32(0), reader.GetInt32(1));
#pragma warning restore CA1849, S6966
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<NamespaceThrottle>> GetNamespaceThrottles(CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetNamespaceThrottles");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var entities = await context.NamespaceThrottles.AsNoTracking().ToListAsync(cancellationToken);

        return [.. entities.Select(e => e.ToDomainModel())];
    }

    internal const string UpsertNamespaceThrottleSql = """
        INSERT INTO engine.namespace_throttles
            (namespace, state, tripped_at, current_window, canaries,
             last_evaluated_at, last_requeued_count, last_active_count, updated_at)
        VALUES
            (@ns, @state, @trippedAt, @currentWindow, @canaries,
             @lastEvaluatedAt, @lastRequeuedCount, @lastActiveCount, @updatedAt)
        ON CONFLICT (namespace) DO UPDATE SET
            state               = EXCLUDED.state,
            tripped_at          = EXCLUDED.tripped_at,
            current_window      = EXCLUDED.current_window,
            canaries            = EXCLUDED.canaries,
            last_evaluated_at   = EXCLUDED.last_evaluated_at,
            last_requeued_count = EXCLUDED.last_requeued_count,
            last_active_count   = EXCLUDED.last_active_count,
            updated_at          = EXCLUDED.updated_at
        """;

    /// <inheritdoc/>
    public async Task UpsertNamespaceThrottle(NamespaceThrottle throttle, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.UpsertNamespaceThrottle");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(UpsertNamespaceThrottleSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", throttle.Namespace));
        cmd.Parameters.Add(new NpgsqlParameter<int>("state", (int)throttle.State));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("trippedAt", throttle.TrippedAt));
        cmd.Parameters.Add(new NpgsqlParameter<TimeSpan>("currentWindow", throttle.CurrentWindow));
        cmd.Parameters.Add(
            new NpgsqlParameter("canaries", NpgsqlDbType.Jsonb)
            {
                // Mirrors NamespaceThrottleEntity.FromDomainModel: an empty canary set is stored as NULL.
                Value =
                    throttle.Canaries.Count > 0
                        ? JsonSerializer.Serialize(throttle.Canaries, JsonOptions.Default)
                        : DBNull.Value,
            }
        );
        cmd.Parameters.Add(
            new NpgsqlParameter("lastEvaluatedAt", NpgsqlDbType.TimestampTz)
            {
                Value = throttle.LastEvaluatedAt.HasValue ? throttle.LastEvaluatedAt.Value : DBNull.Value,
            }
        );
        cmd.Parameters.Add(new NpgsqlParameter<int>("lastRequeuedCount", throttle.LastRequeuedCount));
        cmd.Parameters.Add(new NpgsqlParameter<int>("lastActiveCount", throttle.LastActiveCount));
        cmd.Parameters.Add(
            new NpgsqlParameter("updatedAt", NpgsqlDbType.TimestampTz)
            {
                Value = throttle.UpdatedAt.HasValue ? throttle.UpdatedAt.Value : DBNull.Value,
            }
        );

        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task DeleteNamespaceThrottle(string ns, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.DeleteNamespaceThrottle");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        await context.NamespaceThrottles.Where(t => t.Namespace == ns).ExecuteDeleteAsync(cancellationToken);
    }

    /// <summary>
    /// Selects the canaries (earliest <c>backoff_until</c> NULLS FIRST — the head of the fetch
    /// order) and atomically unparks them: a rotation may promote a parked row, and canaries
    /// probe on the normal retry schedule. <c>FOR UPDATE OF w SKIP LOCKED</c> skips rows a
    /// worker holds mid-write, mirroring the fetch gate's locking discipline.
    /// </summary>
    internal const string SelectThrottleCanariesSql = $"""
        WITH picked AS (
            SELECT w.id, COALESCE(s.requeue_count, 0) AS requeue_count
            FROM engine.workflows w
            LEFT JOIN LATERAL (
                {CurrentStepLateral}
            ) s ON TRUE
            WHERE w.namespace = @ns
              AND w.status = {RequeuedLiteral}
              AND NOT (w.id = ANY(@excluded))
            ORDER BY w.backoff_until NULLS FIRST, w.id
            LIMIT @count
            FOR UPDATE OF w SKIP LOCKED
        ),
        unparked AS (
            UPDATE engine.workflows w
            SET throttled_until = NULL
            FROM picked p
            WHERE w.id = p.id
        )
        SELECT id, requeue_count FROM picked
        """;

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ThrottleCanary>> SelectThrottleCanaries(
        string ns,
        int count,
        IReadOnlyList<Guid> excludeWorkflowIds,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.SelectThrottleCanaries");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(SelectThrottleCanariesSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
        cmd.Parameters.Add(new NpgsqlParameter<int>("count", count));
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("excluded", [.. excludeWorkflowIds]));

        var canaries = new List<ThrottleCanary>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966
            canaries.Add(new ThrottleCanary(reader.GetGuid(0), reader.GetInt32(1)));
#pragma warning restore CA1849, S6966
        }

        return canaries;
    }

    internal const string CanaryObservationsSql = $"""
        SELECT w.id, w.status, COALESCE(s.requeue_count, 0)
        FROM engine.workflows w
        LEFT JOIN LATERAL (
            {CurrentStepLateral}
        ) s ON TRUE
        WHERE w.id = ANY(@ids)
        """;

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ThrottleCanaryObservation>> GetThrottleCanaryObservations(
        IReadOnlyList<Guid> workflowIds,
        CancellationToken cancellationToken
    )
    {
        if (workflowIds.Count == 0)
            return [];

        using var activity = Metrics.Source.StartActivity("EngineRepository.GetThrottleCanaryObservations");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(CanaryObservationsSql);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", [.. workflowIds]));

        var observations = new List<ThrottleCanaryObservation>(workflowIds.Count);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966
            observations.Add(
                new ThrottleCanaryObservation(
                    reader.GetGuid(0),
                    (PersistentItemStatus)reader.GetInt32(1),
                    reader.GetInt32(2)
                )
            );
#pragma warning restore CA1849, S6966
        }

        return observations;
    }

    /// <summary>
    /// One keyset page of park candidates with the deadline-clamp inputs: the current step's
    /// retry strategy and anchor fields, and the previous step's completion time. Rows whose
    /// stamp would land below the restamp cutoff are not revisited within a pass because
    /// pagination is by id, not by the throttle predicate.
    /// Hoisted for <c>QueryPlanTests</c>.
    /// </summary>
    internal const string ParkCandidatesSql = $"""
        SELECT w.id, s.retry_strategy_json, s.last_deferred_at, s.created_at, prev.updated_at
        FROM engine.workflows w
        JOIN LATERAL (
            {CurrentStepLateral}
        ) s ON TRUE
        LEFT JOIN LATERAL (
            SELECT p.updated_at
            FROM engine.steps p
            WHERE p.job_id = w.id AND p.processing_order = s.processing_order - 1
            LIMIT 1
        ) prev ON TRUE
        WHERE w.namespace = @ns
          AND w.status = {RequeuedLiteral}
          AND NOT (w.id = ANY(@excluded))
          AND (w.throttled_until IS NULL OR w.throttled_until <= @cutoff)
          AND w.id > @afterId
        ORDER BY w.id
        LIMIT @limit
        """;

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ThrottleParkCandidate>> GetThrottleParkCandidates(
        string ns,
        IReadOnlyList<Guid> excludeWorkflowIds,
        DateTimeOffset restampCutoff,
        Guid afterWorkflowId,
        int limit,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetThrottleParkCandidates");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(ParkCandidatesSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("excluded", [.. excludeWorkflowIds]));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("cutoff", restampCutoff));
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("afterId", afterWorkflowId));
        cmd.Parameters.Add(new NpgsqlParameter<int>("limit", limit));

        var candidates = new List<ThrottleParkCandidate>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966
            var workflowId = reader.GetGuid(0);
            var retryStrategyJson = reader.IsDBNull(1) ? null : reader.GetString(1);
            var lastDeferredAt = reader.IsDBNull(2) ? (DateTimeOffset?)null : reader.GetFieldValue<DateTimeOffset>(2);
            var stepCreatedAt = reader.GetFieldValue<DateTimeOffset>(3);
            var previousStepUpdatedAt = reader.IsDBNull(4)
                ? (DateTimeOffset?)null
                : reader.GetFieldValue<DateTimeOffset>(4);
#pragma warning restore CA1849, S6966

            var retryStrategy = retryStrategyJson is null
                ? null
                : JsonSerializer.Deserialize<Resilience.Models.RetryStrategy>(retryStrategyJson, JsonOptions.Default);

            candidates.Add(
                new ThrottleParkCandidate(
                    workflowId,
                    retryStrategy,
                    lastDeferredAt,
                    stepCreatedAt,
                    previousStepUpdatedAt
                )
            );
        }

        return candidates;
    }

    /// <summary>
    /// Unnest bulk stamp, guarded per row like the lease-CAS writes: only rows still
    /// <c>Requeued</c> at write time are stamped. Deliberately does not touch
    /// <c>updated_at</c> — throttle effects live only in <c>throttled_until</c>.
    /// </summary>
    internal const string StampThrottledUntilSql = $"""
        UPDATE engine.workflows w
        SET throttled_until = v.throttled_until
        FROM (
            SELECT * FROM unnest(@ids, @deadlines) AS t(id, throttled_until)
            ORDER BY t.id
        ) AS v
        WHERE w.id = v.id
          AND w.status = {RequeuedLiteral}
        """;

    /// <inheritdoc/>
    public async Task<int> StampThrottledUntil(
        IReadOnlyList<(Guid WorkflowId, DateTimeOffset ThrottledUntil)> stamps,
        CancellationToken cancellationToken
    )
    {
        if (stamps.Count == 0)
            return 0;

        using var activity = Metrics.Source.StartActivity("EngineRepository.StampThrottledUntil");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var ids = new Guid[stamps.Count];
        var deadlines = new DateTimeOffset[stamps.Count];
        for (int i = 0; i < stamps.Count; i++)
        {
            ids[i] = stamps[i].WorkflowId;
            deadlines[i] = stamps[i].ThrottledUntil;
        }

        await using var cmd = dataSource.CreateCommand(StampThrottledUntilSql);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
        cmd.Parameters.Add(
            new NpgsqlParameter("deadlines", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz) { Value = deadlines }
        );

        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Oldest-first (fair, and nearest-deadline-first) release with a jittered smear stamp:
    /// <c>now + random() * smear</c> spreads the cohort across the poll window instead of
    /// waking it in one fetch cycle. NULL-clearing here would do exactly that.
    /// </summary>
    internal const string ReleaseThrottledCohortSql = $"""
        WITH cohort AS (
            SELECT id
            FROM engine.workflows
            WHERE namespace = @ns
              AND status = {RequeuedLiteral}
              AND throttled_until > @now
            ORDER BY created_at, id
            LIMIT @cohortSize
            FOR UPDATE SKIP LOCKED
        )
        UPDATE engine.workflows w
        SET throttled_until = @now + (random() * @smear)
        FROM cohort c
        WHERE w.id = c.id
        """;

    /// <inheritdoc/>
    public async Task<int> ReleaseThrottledCohort(
        string ns,
        int cohortSize,
        DateTimeOffset now,
        TimeSpan smear,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ReleaseThrottledCohort");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(ReleaseThrottledCohortSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
        cmd.Parameters.Add(new NpgsqlParameter<int>("cohortSize", cohortSize));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
        cmd.Parameters.Add(new NpgsqlParameter<TimeSpan>("smear", smear));

        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    internal const string ClearNamespaceThrottledUntilSql = """
        UPDATE engine.workflows
        SET throttled_until = NULL
        WHERE namespace = @ns
          AND throttled_until IS NOT NULL
        """;

    /// <inheritdoc/>
    public async Task<int> ClearNamespaceThrottledUntil(string ns, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ClearNamespaceThrottledUntil");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        await using var cmd = dataSource.CreateCommand(ClearNamespaceThrottledUntilSql);
        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
