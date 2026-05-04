using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class QueryPlanTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _now = new(2026, 3, 19, 12, 0, 0, TimeSpan.Zero);
    private readonly FakeTimeProvider _timeProvider = new(_now);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        await using var ctx = fixture.CreateDbContext();
        await ctx.Database.ExecuteSqlRawAsync(
            "TRUNCATE engine.idempotency_keys",
            TestContext.Current.CancellationToken
        );
        await SeedData(TestContext.Current.CancellationToken);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    // --- EF Core queries (via SqlCapturingInterceptor) ---

    [Fact]
    public async Task FetchAndLock_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.FetchAndLockWorkflows(count: 5, ct);

        // The FetchAndLock CTE is the largest captured query — find it by the "ready" CTE keyword
        var fetchQuery = interceptor.Queries.FirstOrDefault(q => q.Sql.Contains("ready", StringComparison.Ordinal));
        Assert.NotNull(fetchQuery);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, fetchQuery, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task GetActiveWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.GetActiveWorkflows(pageSize: 100, cancellationToken: ct);

        // The active workflows query filters on Incomplete statuses + StartAt; anchor the matcher
        // on the FROM clause and the start_at predicate so an unrelated captured statement (e.g.
        // a different split include) cannot be mistaken for it.
        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("FROM engine.workflows", StringComparison.Ordinal)
            && q.Sql.Contains("start_at", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task GetScheduledWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.GetScheduledWorkflows(pageSize: 100, cancellationToken: ct);

        // The scheduled query has the same shape as Active but additionally references
        // workflow_dependency via the Dependencies.Any sub-query — anchor on that to disambiguate.
        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("FROM engine.workflows", StringComparison.Ordinal)
            && q.Sql.Contains("workflow_dependency", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task GetWorkflowsByStatus_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.QueryWorkflows(
            pageSize: 100,
            statuses: [PersistentItemStatus.Completed, PersistentItemStatus.Failed],
            cancellationToken: ct
        );

        // QueryWorkflows uses Include(Steps) without AsSplitQuery, so the main query JOINs
        // engine.steps inline — anchor on that to pick the right captured statement.
        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("FROM engine.workflows", StringComparison.Ordinal)
            && q.Sql.Contains("JOIN engine.steps", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    // --- Raw SQL queries (via static strings) ---

    [Fact]
    public async Task PurgeExpiredWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.PurgeExpiredWorkflows,
            [
                new NpgsqlParameter<DateTimeOffset>("cutoff", _now.AddDays(-30)),
                new NpgsqlParameter<int>("batchSize", 1000),
            ],
            ct
        );

        // The retention query should use the UpdatedAt filtered index on terminal statuses
        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task AbandonStaleWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.AbandonStaleWorkflows,
            [
                new NpgsqlParameter<DateTimeOffset>("now", _now),
                new NpgsqlParameter<DateTimeOffset>("staleDeadline", _now.AddSeconds(-15)),
                new NpgsqlParameter<int>("maxReclaimCount", 3),
            ],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task ReclaimStaleWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.ReclaimStaleWorkflows,
            [
                new NpgsqlParameter<DateTimeOffset>("now", _now),
                new NpgsqlParameter<DateTimeOffset>("staleDeadline", _now.AddSeconds(-15)),
                new NpgsqlParameter<int>("maxReclaimCount", 3),
            ],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task DeleteOrphanedIdempotencyKeys_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.DeleteOrphanedIdempotencyKeys,
            [new NpgsqlParameter<DateTimeOffset>("cutoff", _now.AddDays(-30))],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "idempotency_keys");
        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        await VerifyJson(plan.GetRawText());
    }

    // --- Seed data ---

    /// <summary>
    /// Seeds representative data across all statuses at sufficient volume that the planner's
    /// cost estimates land off the cost-borderline knife-edge. With only a handful of
    /// workflow_dependency rows (the prior shape of this seed), the planner's choice between
    /// Hash Join and Merge Join for this table was a tie, leaving plan selection at the mercy
    /// of background autoanalyze timing and producing different snapshots across CI vs local
    /// runs (and across consecutive local runs of the same test). Bulking the seed up by ~100×
    /// gives the planner clear cost differentials and converges on a single deterministic plan
    /// in every environment, which is what these snapshot tests need to be a useful regression
    /// gate. Status distribution is preserved at scale.
    /// </summary>
    private async Task SeedData(CancellationToken ct)
    {
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        const int workflowCount = 2800; // 100× the original 28-workflow shape

        // Bulk insert all workflows in a single statement using generate_series. Status mapping
        // mirrors the original 28-element array so the same proportions carry through:
        //   0..2 → Enqueued (0)        3..5  → Processing (1)
        //   6..8 → Requeued (2)        9..18 → Completed (3)
        //   19..23 → Failed (4)       24..25 → Canceled (5)
        //   26..27 → DependencyFailed (6)
        // heartbeat_at is set on Requeued (status=2) rows; backoff_until on Processing (status=1).
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.workflows
                    (id, operation_id, idempotency_key, namespace, status,
                     created_at, updated_at, reclaim_count, heartbeat_at, backoff_until)
                SELECT
                    gen_random_uuid(),
                    'test-op',
                    md5(g::text),
                    'test-ns',
                    s.status,
                    s.created_at,
                    s.updated_at,
                    0,
                    CASE WHEN s.status = 2 THEN s.updated_at ELSE NULL END,
                    CASE WHEN s.status = 1 THEN @backoffMoment ELSE NULL END
                FROM generate_series(0, @count - 1) AS g
                CROSS JOIN LATERAL (
                    SELECT
                        (ARRAY[0,0,0,1,1,1,2,2,2,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,5,5,6,6])[(g % 28) + 1] AS status,
                        @baseTime - (INTERVAL '1 minute' * (@count - g))                              AS created_at,
                        @baseTime - (INTERVAL '1 minute' * (@count - g)) + INTERVAL '5 minutes'       AS updated_at
                ) AS s
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("count", workflowCount);
            cmd.Parameters.AddWithValue("baseTime", _now);
            cmd.Parameters.AddWithValue("backoffMoment", _now.AddSeconds(-10));
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Two steps per workflow, copying the workflow's own status/created_at.
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.steps
                    (id, job_id, operation_id, command_json,
                     status, created_at, processing_order, requeue_count)
                SELECT
                    gen_random_uuid(),
                    w.id,
                    'step-op',
                    '{"type":"webhook"}'::jsonb,
                    w.status,
                    w.created_at,
                    s.ord,
                    0
                FROM engine.workflows w
                CROSS JOIN generate_series(0, 1) AS s(ord)
                """
            )
        )
        {
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Dependencies: two outgoing edges per workflow using stride-1 and stride-7 row offsets.
        // That gives 2 × workflowCount rows (~5600) — well past the cost-borderline regime —
        // while keeping the (workflow_id, depends_on_workflow_id) pairs unique. The strides
        // distribute target workflows across statuses since rows are ordered by created_at.
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.workflow_dependency (workflow_id, depends_on_workflow_id)
                WITH ordered AS (
                    SELECT id, (row_number() OVER (ORDER BY created_at, id) - 1) AS rn
                    FROM engine.workflows
                )
                SELECT a.id, b.id
                FROM ordered a
                JOIN ordered b ON b.rn = (a.rn + 1) % @count
                UNION ALL
                SELECT a.id, b.id
                FROM ordered a
                JOIN ordered b ON b.rn = (a.rn + 7) % @count
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("count", workflowCount);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Idempotency keys at proportional scale (was 10, now 1000), each referencing one workflow.
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.idempotency_keys
                    (idempotency_key, namespace, request_body_hash, workflow_ids, created_at)
                SELECT
                    'seed-key-' || g,
                    'test-ns',
                    '\x01'::bytea,
                    ARRAY[w.id],
                    @baseTime - (INTERVAL '1 hour' * g)
                FROM generate_series(0, @keys - 1) AS g
                JOIN LATERAL (
                    SELECT id FROM engine.workflows ORDER BY created_at, id OFFSET (g % @count) LIMIT 1
                ) AS w ON TRUE
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("keys", 1000);
            cmd.Parameters.AddWithValue("count", workflowCount);
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Refresh planner statistics
        await using var analyzeCmd = dataSource.CreateCommand(
            "ANALYZE engine.workflows, engine.steps, engine.workflow_dependency, engine.idempotency_keys"
        );
        await analyzeCmd.ExecuteNonQueryAsync(ct);
    }
}
