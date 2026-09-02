using System.Text.Json;
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

    /// <summary>The log position <see cref="SeedParkedReceivers"/> parks a receiver at.</summary>
    private const long ParkedSeq = 2;

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
    public async Task FetchAndLock_ThrottlingEnabled_UsesIndexScans()
    {
        // The throttle-gated fetch variant (throttled_until predicate) must keep being served by
        // the partial fetch-gate index, which carries throttled_until as an INCLUDE column.
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var settings = Microsoft.Extensions.Options.Options.Create(
            fixture.Settings with
            {
                Throttling = new ThrottlingSettings { Enabled = true },
            }
        );
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, settings, _timeProvider);

        await repo.FetchAndLockWorkflows(count: 5, ct);

        var fetchQuery = interceptor.Queries.FirstOrDefault(q =>
            q.Sql.Contains("throttled_until", StringComparison.Ordinal)
        );
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
    public async Task MintMailboxes_ProbesBothMailboxIndexesForEveryCandidateInTheBatch()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(dataSource, EngineRepository.MintMailboxesSql, MintArrays(1), ct);

        AssertMintProbesItsIndexes(plan);
        await VerifyJson(plan.GetRawText()).UseTextForParameters("width-1");

        // PostgreSQL plans a custom plan from the array's length, so neither width is evidence about the other
        var flushPlan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.MintMailboxesSql,
            MintArrays(100),
            ct
        );

        AssertMintProbesItsIndexes(flushPlan);
        await VerifyJson(flushPlan.GetRawText()).UseTextForParameters("width-100");
    }

    /// <summary>
    /// A column out of either <c>Index Cond</c> would have a mint read the whole namespace's keys, or every open
    /// mailbox in it, rather than one probe per candidate key and per distinct collection key.
    /// </summary>
    private static void AssertMintProbesItsIndexes(JsonElement plan)
    {
        QueryPlanHelper.AssertNoSeqScan(plan, "mailboxes");

        QueryPlanHelper.AssertHasScanType(plan, "mailboxes", "Index Only Scan");

        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "ix_mailboxes_namespace_idempotency_key");
        QueryPlanHelper.AssertIndexCondContains(
            plan,
            "ix_mailboxes_namespace_idempotency_key",
            "t.ns",
            "t.idempotency_key"
        );

        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "ix_mailboxes_namespace_collection_key");
        QueryPlanHelper.AssertIndexCondContains(
            plan,
            "ix_mailboxes_namespace_collection_key",
            "k.ns",
            "k.collection_key"
        );
    }

    /// <summary>
    /// <paramref name="width"/> fresh candidate keys, spread over the seed's collections so the count has real
    /// rows to probe for.
    /// </summary>
    private static NpgsqlParameter[] MintArrays(int width)
    {
        var candidates = Enumerable.Range(0, width).Select(i => new Guid($"0197a4f0-0000-7000-8000-{i:D12}")).ToArray();

        return
        [
            new NpgsqlParameter<Guid[]>("ids", candidates),
            new NpgsqlParameter<string[]>("namespaces", [.. candidates.Select(_ => "test-ns")]),
            new NpgsqlParameter<string[]>("keys", [.. Enumerable.Range(0, width).Select(i => $"plan-probe-{i}")]),
            new NpgsqlParameter<string?[]>(
                "collection_keys",
                [.. Enumerable.Range(0, width).Select(i => $"seed-collection-{i % 50}")]
            ),
            new NpgsqlParameter<TimeSpan[]>("timeouts", [.. candidates.Select(_ => TimeSpan.FromHours(1))]),
            new NpgsqlParameter<DateTimeOffset[]>("deadlines", [.. candidates.Select(_ => _now.AddHours(1))]),
            new NpgsqlParameter<DateTimeOffset[]>("nows", [.. candidates.Select(_ => _now)]),
            new NpgsqlParameter<int>("cap", 100),
        ];
    }

    [Fact]
    public async Task LockMailboxesForMutation_ProbesThePrimaryKeyForEveryMailboxInAFullBatch()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        // PostgreSQL plans a custom plan from the array's length, so a hundred ids is a different plan than two
        var ids = Enumerable.Range(1, 100).Select(i => new Guid($"0197a4f0-0000-7000-8000-{i:D12}")).ToArray();

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.LockMailboxesForMutationSql,
            [
                new NpgsqlParameter<Guid[]>("ids", ids),
                new NpgsqlParameter<string[]>("namespaces", [.. ids.Select(_ => "test-ns")]),
            ],
            ct
        );

        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "pk_mailboxes");
        QueryPlanHelper.AssertIndexCondContains(plan, "pk_mailboxes", "t.id");

        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task SelectExistingMailboxDeliveries_ProbesTheMessageKeyForEveryPairInTheBatch()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.SelectExistingMailboxDeliveriesSql,
            DeliveryLookupArrays(1),
            ct
        );

        AssertDeliveryLookupProbesItsIndex(plan);
        await VerifyJson(plan.GetRawText()).UseTextForParameters("width-1");

        // PostgreSQL plans a custom plan from the array's length, so neither width is evidence about the other
        var flushPlan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.SelectExistingMailboxDeliveriesSql,
            DeliveryLookupArrays(100),
            ct
        );

        AssertDeliveryLookupProbesItsIndex(flushPlan);
        await VerifyJson(flushPlan.GetRawText()).UseTextForParameters("width-100");
    }

    /// <summary>
    /// Which columns sit in the <c>Index Cond</c> is the assertion that matters, not the node type: an index scan
    /// that keeps the index but loses the message key reads every message of every mailbox in the flush.
    /// </summary>
    private static void AssertDeliveryLookupProbesItsIndex(JsonElement plan)
    {
        QueryPlanHelper.AssertNoSeqScan(plan, "mailbox_deliveries");
        QueryPlanHelper.AssertUsesIndexScan(
            plan,
            "mailbox_deliveries",
            "ix_mailbox_deliveries_mailbox_id_idempotency_key"
        );
        QueryPlanHelper.AssertIndexCondContains(
            plan,
            "ix_mailbox_deliveries_mailbox_id_idempotency_key",
            "t.mailbox_id",
            "t.idempotency_key"
        );
    }

    /// <summary>
    /// <paramref name="width"/> pairs, one mailbox each — the wider probe of the two shapes a flush can have.
    /// </summary>
    private static NpgsqlParameter[] DeliveryLookupArrays(int width) =>
        [
            new NpgsqlParameter<Guid[]>(
                "mailbox_ids",
                [.. Enumerable.Range(1, width).Select(i => new Guid($"0197a4f0-0000-7000-8000-{i:D12}"))]
            ),
            new NpgsqlParameter<string[]>("keys", [.. Enumerable.Range(1, width).Select(i => $"plan-probe-msg-{i}")]),
        ];

    [Fact]
    public async Task CloseLockedMailboxes_ProbesThePrimaryKeyForEveryMailboxInTheBatch()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.CloseLockedMailboxesSql,
            [
                new NpgsqlParameter<Guid[]>(
                    "ids",
                    [new Guid("0197a4f0-0000-7000-8000-000000000001"), new Guid("0197a4f0-0000-7000-8000-000000000002")]
                ),
                new NpgsqlParameter<string[]>("reasons", ["request", "deadline"]),
                new NpgsqlParameter<DateTimeOffset[]>("nows", [_now, _now]),
            ],
            ct
        );

        QueryPlanHelper.AssertUsesIndexScan(plan, "mailboxes", "pk_mailboxes");
        QueryPlanHelper.AssertIndexCondContains(plan, "pk_mailboxes", "t.id");

        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task ReleaseMailboxReceivers_ProbesTheReceiverKeyForEveryPositionInTheBatch()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        await SeedParkedReceivers(dataSource, ct);

        // Both shapes the statement carries: a wake naming one position, a closure release taking a whole range
        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.ReleaseMailboxReceiversSql,
            [
                new NpgsqlParameter<Guid[]>(
                    "mailbox_ids",
                    [new Guid("0197a4f0-0000-7000-8000-000000000001"), new Guid("0197a4f0-0000-7000-8000-000000000002")]
                ),
                new NpgsqlParameter<long[]>("seq_los", [ParkedSeq, 0]),
                new NpgsqlParameter<long[]>("seq_his", [ParkedSeq, long.MaxValue]),
                new NpgsqlParameter<DateTimeOffset[]>("nows", [_now, _now]),
                new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued),
                new NpgsqlParameter<int>("held", (int)PersistentItemStatus.Held),
            ],
            ct
        );

        QueryPlanHelper.AssertUsesIndexScan(plan, "mailbox_receivers", "pk_mailbox_receivers");
        QueryPlanHelper.AssertUsesIndexScan(plan, "workflows", "pk_workflows");
        QueryPlanHelper.AssertNoSeqScan(plan, "mailbox_receivers");
        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");

        QueryPlanHelper.AssertIndexCondContains(plan, "pk_mailbox_receivers", "t.mailbox_id", "t.seq_lo", "t.seq_hi");
        QueryPlanHelper.AssertIndexCondContains(plan, "pk_mailbox_receivers", "released.mailbox_id", "released.seq");
        QueryPlanHelper.AssertIndexCondContains(plan, "pk_workflows", "workflow_id");

        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task CountOverdueOpenMailboxes_UsesIndexScans()
    {
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

    [Fact]
    public async Task NamespaceWorkflowCounts_IsServedByTheNamespaceStatusIndex()
    {
        // The sweep's trip detection runs this every cycle over every incomplete workflow in the
        // fleet, and ix_workflows_namespace_status_incomplete exists for it alone — its doc claims
        // the counts resolve from the index without touching the heap. Nothing verified that
        // claim, which is exactly how a partial filter drifts out of step with its query.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.NamespaceWorkflowCountsSql,
            null,
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        QueryPlanHelper.AssertUsesIndex(plan, "workflows", "ix_workflows_namespace_status_incomplete");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task ParkCandidates_IsServedByTheNamespaceStatusIndex()
    {
        // One keyset page of the park pass: filtered by (namespace, status), ordered by id. A park
        // pass walks the whole Requeued population of a namespace one page at a time, so a plan
        // that scans the table here scans it once per page.
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var plan = await QueryPlanHelper.ExplainAsync(
            dataSource,
            EngineRepository.ParkCandidatesSql,
            [
                new NpgsqlParameter<string>("ns", "test-ns"),
                new NpgsqlParameter<Guid[]>("excluded", []),
                new NpgsqlParameter<DateTimeOffset>("cutoff", _now),
                new NpgsqlParameter<Guid>("afterId", Guid.Empty),
                new NpgsqlParameter<int>("limit", 500),
            ],
            ct
        );

        QueryPlanHelper.AssertNoSeqScan(plan, "workflows");
        QueryPlanHelper.AssertUsesIndex(plan, "workflows", "ix_workflows_namespace_status_incomplete");
        await VerifyJson(plan.GetRawText());
    }

    // --- Seed data ---

    /// <summary>
    /// Tops the seed up with parked receivers on open mailboxes. <see cref="SeedData"/> leaves nothing to
    /// release, and with <c>status = held</c> estimated empty the planner drives the release from the workflows
    /// index and checks the batch arrays as a join filter — the one shape a wake never runs.
    /// </summary>
    private static async Task SeedParkedReceivers(NpgsqlDataSource dataSource, CancellationToken ct)
    {
        const int parkedCount = 500;

        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.workflows
                    (id, operation_id, idempotency_key, namespace, status, created_at, updated_at, reclaim_count)
                SELECT gen_random_uuid(), 'test-op', 'held-' || g, 'test-ns', @held, @baseTime, @baseTime, 0
                FROM generate_series(0, @parked - 1) AS g
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("held", (int)PersistentItemStatus.Held);
            cmd.Parameters.AddWithValue("parked", parkedCount);
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // ParkedSeq onwards is free: the seed's receivers occupy positions 0 and 1 of every mailbox.
        await using (
            var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at, claimed_at)
                SELECT m.id, @parkedSeq, w.id, @baseTime, NULL, NULL
                FROM (
                    SELECT id, row_number() OVER (ORDER BY id) AS rn
                    FROM engine.workflows WHERE status = @held
                ) w
                JOIN (
                    SELECT id, row_number() OVER (ORDER BY id) AS rn
                    FROM engine.mailboxes WHERE status = 'open' LIMIT @parked
                ) m ON m.rn = w.rn
                """
            )
        )
        {
            cmd.Parameters.AddWithValue("held", (int)PersistentItemStatus.Held);
            cmd.Parameters.AddWithValue("parked", parkedCount);
            cmd.Parameters.AddWithValue("parkedSeq", ParkedSeq);
            cmd.Parameters.AddWithValue("baseTime", _now);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await using var analyzeCmd = dataSource.CreateCommand("ANALYZE engine.workflows, engine.mailbox_receivers");
        await analyzeCmd.ExecuteNonQueryAsync(ct);
    }

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

        // Seeded past the size where the planner stops caring, in the sweep's own regime (far more qualifying
        // rows than one LIMIT takes):
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

        // Child tables populated in the design's own proportion: empty or tiny tables tip the planner into
        // plans production never runs.
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
