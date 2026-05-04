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
            """TRUNCATE "engine"."IdempotencyKeys" """,
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

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task GetActiveWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.GetActiveWorkflows(pageSize: 100, cancellationToken: ct);

        // The active workflows query filters on Status with Incomplete statuses
        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("\"Workflows\"", StringComparison.Ordinal)
            && q.Sql.Contains("\"Status\"", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
        await VerifyJson(plan.GetRawText());
    }

    [Fact]
    public async Task GetScheduledWorkflows_UsesIndexScans()
    {
        var ct = TestContext.Current.CancellationToken;
        var interceptor = new SqlCapturingInterceptor();
        var repo = fixture.CreateRepositoryWithInterceptor(interceptor, timeProvider: _timeProvider);

        await repo.GetScheduledWorkflows(pageSize: 100, cancellationToken: ct);

        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("\"Workflows\"", StringComparison.Ordinal)
            && q.Sql.Contains("\"Status\"", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
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

        var query = interceptor.Queries.LastOrDefault(q =>
            q.Sql.Contains("\"Workflows\"", StringComparison.Ordinal)
            && q.Sql.Contains("\"Status\"", StringComparison.Ordinal)
        );
        Assert.NotNull(query);

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var plan = await QueryPlanHelper.ExplainAsync(dataSource, query, ct);

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
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
        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
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

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
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

        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
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

        QueryPlanHelper.AssertNoSeqScan(plan, "IdempotencyKeys");
        QueryPlanHelper.AssertNoSeqScan(plan, "Workflows");
        await VerifyJson(plan.GetRawText());
    }

    // --- Seed data ---

    /// <summary>
    /// Seeds representative data across various statuses so the query planner has
    /// realistic statistics. Followed by ANALYZE to refresh planner stats.
    /// </summary>
    private async Task SeedData(CancellationToken ct)
    {
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        // Insert workflows across all statuses
        var statuses = new[] { 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 6, 6 };
        var workflowIds = new List<Guid>();

        for (int i = 0; i < statuses.Length; i++)
        {
            var id = Guid.NewGuid();
            workflowIds.Add(id);

            var status = statuses[i];
            var createdAt = _now.AddHours(-(statuses.Length - i));
            var updatedAt = createdAt.AddMinutes(5);

            // Processing workflows get a heartbeat; some are stale
            DateTimeOffset? heartbeatAt = status == 2 ? updatedAt : null;
            DateTimeOffset? backoffUntil = status == 1 ? _now.AddSeconds(-10) : null;

            await using var cmd = dataSource.CreateCommand(
                """
                INSERT INTO engine."Workflows"
                    ("Id", "OperationId", "IdempotencyKey", "Namespace", "Status",
                     "CreatedAt", "UpdatedAt", "ReclaimCount", "HeartbeatAt", "BackoffUntil")
                VALUES (@id, 'test-op', @idemKey, 'test-ns', @status,
                        @createdAt, @updatedAt, 0, @heartbeatAt, @backoffUntil)
                """
            );
            cmd.Parameters.AddWithValue("id", id);
            cmd.Parameters.AddWithValue("idemKey", id.ToString("N"));
            cmd.Parameters.AddWithValue("status", status);
            cmd.Parameters.AddWithValue("createdAt", createdAt);
            cmd.Parameters.AddWithValue("updatedAt", updatedAt);
            cmd.Parameters.AddWithValue("heartbeatAt", heartbeatAt.HasValue ? heartbeatAt.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("backoffUntil", backoffUntil.HasValue ? backoffUntil.Value : DBNull.Value);
            await cmd.ExecuteNonQueryAsync(ct);

            // Add steps for each workflow
            for (int s = 0; s < 2; s++)
            {
                await using var stepCmd = dataSource.CreateCommand(
                    """
                    INSERT INTO engine."Steps"
                        ("Id", "JobId", "OperationId", "CommandJson",
                         "Status", "CreatedAt", "ProcessingOrder", "RequeueCount")
                    VALUES (@id, @jobId, 'step-op', '{"type":"webhook"}',
                            @status, @createdAt, @order, 0)
                    """
                );
                stepCmd.Parameters.AddWithValue("id", Guid.NewGuid());
                stepCmd.Parameters.AddWithValue("jobId", id);
                stepCmd.Parameters.AddWithValue("status", status);
                stepCmd.Parameters.AddWithValue("createdAt", createdAt);
                stepCmd.Parameters.AddWithValue("order", s);
                await stepCmd.ExecuteNonQueryAsync(ct);
            }
        }

        // Add some dependencies between workflows
        if (workflowIds.Count >= 4)
        {
            await InsertDependency(dataSource, workflowIds[0], workflowIds[1], ct);
            await InsertDependency(dataSource, workflowIds[2], workflowIds[3], ct);
        }

        // Add idempotency keys
        for (int i = 0; i < 10; i++)
        {
            var refIds = new[] { workflowIds[i % workflowIds.Count] };
            await InsertIdempotencyKey(
                dataSource,
                key: $"seed-key-{i}",
                ns: "test-ns",
                workflowIds: refIds,
                createdAt: _now.AddHours(-i),
                ct
            );
        }

        // Refresh planner statistics
        await using var analyzeCmd = dataSource.CreateCommand(
            """ANALYZE engine."Workflows", engine."Steps", engine."IdempotencyKeys" """
        );
        await analyzeCmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertDependency(
        NpgsqlDataSource dataSource,
        Guid workflowId,
        Guid dependsOnId,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine."WorkflowDependency" ("WorkflowId", "DependsOnWorkflowId")
            VALUES (@workflowId, @dependsOnId)
            """
        );
        cmd.Parameters.AddWithValue("workflowId", workflowId);
        cmd.Parameters.AddWithValue("dependsOnId", dependsOnId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertIdempotencyKey(
        NpgsqlDataSource dataSource,
        string key,
        string ns,
        Guid[] workflowIds,
        DateTimeOffset createdAt,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine."IdempotencyKeys" ("IdempotencyKey", "Namespace", "RequestBodyHash", "WorkflowIds", "CreatedAt")
            VALUES (@key, @ns, @hash, @workflowIds, @createdAt)
            """
        );
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("ns", ns);
        cmd.Parameters.AddWithValue("hash", new byte[] { 0x01 });
        cmd.Parameters.AddWithValue("workflowIds", workflowIds);
        cmd.Parameters.AddWithValue("createdAt", createdAt);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
