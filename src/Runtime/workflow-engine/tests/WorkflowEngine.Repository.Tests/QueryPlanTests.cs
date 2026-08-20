using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Npgsql;
using WorkflowEngine.Data.Repository;
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
    public async Task SelectExpiredWorkflowCandidates_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.SelectExpiredWorkflowCandidatesCommand,
            [
                new NpgsqlParameter<DateTimeOffset>("cutoff", _now.AddDays(-30)),
                new NpgsqlParameter<int>("batchSize", 1000),
            ],
            ct
        );

        // The retention query must range-scan the UpdatedAt partial index on terminal statuses.
        // AssertNoSeqScan alone is not enough: when the index filter fell out of sync with the
        // query's status list, the plan silently degraded to a bitmap scan over ix_workflows_status.
        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        QueryPlanHelper.AssertUsesIndexScan(plan, "workflows", "ix_workflows_updated_at");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task FailPoisonedWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.FailPoisonedWorkflows,
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

    [Fact]
    public async Task SelectOverdueMailboxCandidates_UsesIndexScans()
    {
        // The scan the deadline sweep runs on every cadence whether or not anything is overdue, so what it costs
        // when nothing is is the cost that matters. ix_mailboxes_deadline_open is partial on 'open' and ordered
        // by deadline, so a quiet tick reads the leading entry and stops.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.SelectOverdueMailboxCandidatesSql,
            [new NpgsqlParameter<DateTimeOffset>("now", _now), new NpgsqlParameter<int>("batch_size", 100)],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "mailboxes");
        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "ix_mailboxes_deadline_open");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task SelectExpiredMailboxCandidates_UsesIndexScans()
    {
        // The retention purge's mirror image, and the more expensive one to get wrong: closed mailboxes
        // accumulate for a whole retention period. The ORDER BY is what makes the index worth having twice
        // over — without ix_mailboxes_disposed_at the planner scans every row and sorts the survivors.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            DbMaintenanceService.Sql.SelectExpiredMailboxCandidatesCommand,
            [
                new NpgsqlParameter<DateTimeOffset>("cutoff", _now.AddDays(-60)),
                new NpgsqlParameter<int>("batchSize", 1000),
            ],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "mailboxes");
        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "ix_mailboxes_disposed_at");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task SelectMailboxesForCollections_UsesIndexScans()
    {
        // The dashboard re-issues this read while it is open, so no part of it may scale with the number of
        // mailboxes retained. ix_mailboxes_namespace_collection_key is why the candidate set does not — 3
        // buffers against 834 for a sequential scan at the design's per-collection density — and a partial
        // index on 'open' could not serve it, since the read is deliberately status-agnostic. The two child
        // tables are reached by primary key, one correlated scan of each per mailbox.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.SelectMailboxesForCollectionsSql,
            [
                new NpgsqlParameter<string[]>("collection_keys", ["seed-collection-3", "seed-collection-7"]),
                new NpgsqlParameter<string>("ns", "test-ns"),
                new NpgsqlParameter<int>("per_collection", 11),
            ],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "mailbox_deliveries");
        QueryPlanHelper.AssertNoSeqScan(plan, "mailbox_receivers");
        QueryPlanHelper.AssertUsesIndex(plan, "mailboxes", "ix_mailboxes_namespace_collection_key");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task MintMailbox_CountsACollectionsOpenMailboxesThroughTheSharedIndex()
    {
        // The other half of ix_mailboxes_namespace_collection_key's job, and the path that runs on every mint.
        // The cap's `open_count` CTE is three equality predicates over exactly the index's key, in order, so
        // it is answered index-only. Pinned here because the widening was done for the dashboard's benefit:
        // nothing else asserts anything about the mint's plan, so a narrowing back to two columns would cost
        // the cap its index-only count with no test to say so.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.MintMailboxSql,
            [
                new NpgsqlParameter<Guid>("id", Guid.CreateVersion7()),
                new NpgsqlParameter<string>("ns", "test-ns"),
                new NpgsqlParameter<string>("key", "plan-probe"),
                new NpgsqlParameter<string>("collection_key", "seed-collection-3"),
                new NpgsqlParameter<TimeSpan>("timeout", TimeSpan.FromHours(1)),
                new NpgsqlParameter<DateTimeOffset>("deadline", _now.AddHours(1)),
                new NpgsqlParameter<DateTimeOffset>("now", _now),
                new NpgsqlParameter<int>("cap", 100),
            ],
            ct
        );

        QueryPlanHelper.AssertUsesIndex(plan, "mailboxes", "ix_mailboxes_namespace_collection_key");
        QueryPlanHelper.AssertHasScanType(plan, "mailboxes", "Index Only Scan");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task CountOverdueOpenMailboxes_UsesIndexScans()
    {
        // The gauge's read, which runs most often of the three that scan this table. It has no LIMIT, so it
        // visits every row that qualifies; being zero on a healthy engine is what makes that free.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.CountOverdueOpenMailboxesSql,
            [
                new NpgsqlParameter<DateTimeOffset>("cutoff", _now.AddMinutes(-5)),
                new NpgsqlParameter<int>("limit", 10_000),
            ],
            ct
        );

        QueryPlanHelper.AssertUsesIndex(plan, "mailboxes", "ix_mailboxes_deadline_open");
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

        // Mailboxes, shaped for the two sweeps that scan this table. Both queries are ORDER BY ... LIMIT, so the
        // plan turns on whether the ordered index can stop early — which it only can when many more rows
        // qualify than the LIMIT takes, which is the regime seeded here and the one that matters.
        //   g % 4 == 0 → open     (of those, g % 8 == 0 → deadline already passed)
        //   g odd      → disposed, disposed_at well past the retention cutoff
        //   g % 4 == 2 → disposed, disposed_at recent
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.mailboxes
                    (id, namespace, idempotency_key, collection_key, timeout, deadline,
                     next_idx, next_seq, status, disposed_reason, created_at, disposed_at)
                SELECT
                    gen_random_uuid(),
                    'test-ns',
                    'seed-mailbox-' || g,
                    'seed-collection-' || (g % 50),
                    INTERVAL '1 hour',
                    CASE WHEN g % 8 = 0
                         THEN @baseTime - (INTERVAL '1 minute' * ((g % 4000) + 1))
                         ELSE @baseTime + (INTERVAL '1 hour' * ((g % 24) + 1))
                    END,
                    0,
                    0,
                    CASE WHEN g % 4 = 0 THEN 'open' ELSE 'disposed' END,
                    CASE WHEN g % 4 = 0 THEN NULL ELSE 'request' END,
                    @baseTime - (INTERVAL '1 minute' * g),
                    CASE
                        WHEN g % 4 = 0 THEN NULL
                        WHEN g % 2 = 1 THEN @baseTime - INTERVAL '90 days' - (INTERVAL '1 minute' * g)
                        ELSE @baseTime - (INTERVAL '1 hour' * (g % 24))
                    END
                FROM generate_series(0, @mailboxes - 1) AS g
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("mailboxes", 40000);
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Two deliveries and two receiver registrations per mailbox, so the dashboard read's child joins are
        // planned against populated tables in the proportion the design produces. An empty child table is
        // planned as a sequential scan of nothing, and populating only a slice tips the planner into hashing
        // them whole — neither is the plan production runs.
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                SELECT m.id, g, 'seed-msg-' || m.id || '-' || g, '{}', @baseTime
                FROM engine.mailboxes m, generate_series(0, 1) AS g
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at, claimed_at)
                SELECT m.id, g, gen_random_uuid(), @baseTime, @baseTime, @baseTime
                FROM engine.mailboxes m, generate_series(0, 1) AS g
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Refresh planner statistics
        await using var analyzeCmd = dataSource.CreateCommand(
            "ANALYZE engine.workflows, engine.steps, engine.workflow_dependency, engine.idempotency_keys, "
                + "engine.mailboxes, engine.mailbox_deliveries, engine.mailbox_receivers"
        );
        await analyzeCmd.ExecuteNonQueryAsync(ct);
    }
}
