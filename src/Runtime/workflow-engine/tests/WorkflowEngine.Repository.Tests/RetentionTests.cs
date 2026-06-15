using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class RetentionTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _now = new(2026, 3, 19, 12, 0, 0, TimeSpan.Zero);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        await using var ctx = fixture.CreateDbContext();
        await ctx.Database.ExecuteSqlRawAsync(
            "TRUNCATE engine.idempotency_keys",
            TestContext.Current.CancellationToken
        );
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Retention_DeletesTerminalWorkflows_PastRetentionPeriod()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var oldWorkflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, oldWorkflowId, status: 3, updatedAt: _now.AddDays(-31), ct: ct);

        var recentWorkflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, recentWorkflowId, status: 3, updatedAt: _now.AddDays(-1), ct: ct);

        var activeWorkflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, activeWorkflowId, status: 1, updatedAt: _now.AddDays(-31), ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        var remaining = await ctx.Workflows.Select(w => w.Id).ToListAsync(ct);

        Assert.DoesNotContain(oldWorkflowId, remaining);
        Assert.Contains(recentWorkflowId, remaining);
        Assert.Contains(activeWorkflowId, remaining);
    }

    [Fact]
    public async Task Retention_DeletesAllTerminalStatuses()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var expired = _now.AddDays(-31);
        await InsertWorkflow(dataSource, Guid.NewGuid(), status: 3, updatedAt: expired, ct: ct);
        await InsertWorkflow(dataSource, Guid.NewGuid(), status: 4, updatedAt: expired, ct: ct);
        await InsertWorkflow(dataSource, Guid.NewGuid(), status: 5, updatedAt: expired, ct: ct);
        await InsertWorkflow(dataSource, Guid.NewGuid(), status: 6, updatedAt: expired, ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        Assert.Equal(0, await ctx.Workflows.CountAsync(ct));
    }

    [Fact]
    public async Task Retention_PreservesWorkflows_ReferencedByActiveDependency()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var depTargetId = Guid.NewGuid();
        await InsertWorkflow(dataSource, depTargetId, status: 3, updatedAt: _now.AddDays(-31), ct: ct);

        var activeId = Guid.NewGuid();
        await InsertWorkflow(dataSource, activeId, status: 1, updatedAt: _now, ct: ct);
        await InsertDependency(dataSource, workflowId: activeId, dependsOnId: depTargetId, ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        var remaining = await ctx.Workflows.Select(w => w.Id).ToListAsync(ct);
        Assert.Contains(depTargetId, remaining);
        Assert.Contains(activeId, remaining);
    }

    [Fact]
    public async Task Retention_PreservesWorkflows_ReferencedByActiveLink()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var linkedTargetId = Guid.NewGuid();
        await InsertWorkflow(dataSource, linkedTargetId, status: 3, updatedAt: _now.AddDays(-31), ct: ct);

        var activeId = Guid.NewGuid();
        await InsertWorkflow(dataSource, activeId, status: 1, updatedAt: _now, ct: ct);
        await InsertLink(dataSource, workflowId: activeId, linkedWorkflowId: linkedTargetId, ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        var remaining = await ctx.Workflows.Select(w => w.Id).ToListAsync(ct);
        Assert.Contains(linkedTargetId, remaining);
        Assert.Contains(activeId, remaining);
    }

    [Fact]
    public async Task Retention_DrainsAllEligibleRows_InBatches()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        // Insert 5 expired workflows, run with batch size 2 — should still delete all 5
        for (var i = 0; i < 5; i++)
            await InsertWorkflow(dataSource, Guid.NewGuid(), status: 3, updatedAt: _now.AddDays(-31), ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), batchSize: 2, ct: ct);

        await using var ctx = fixture.CreateDbContext();
        Assert.Equal(0, await ctx.Workflows.CountAsync(ct));
    }

    [Fact]
    public async Task Retention_CascadeDeletesSteps()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, status: 3, updatedAt: _now.AddDays(-31), ct: ct);
        await InsertStep(dataSource, workflowId, ct: ct);
        await InsertStep(dataSource, workflowId, ct: ct);

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        Assert.Equal(0, await ctx.Workflows.CountAsync(ct));
        Assert.Equal(0, await ctx.Steps.CountAsync(ct));
    }

    [Fact]
    public async Task Retention_DeletesOrphanedIdempotencyKeys()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var deletedWorkflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, deletedWorkflowId, status: 3, updatedAt: _now.AddDays(-31), ct: ct);

        var survivingWorkflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, survivingWorkflowId, status: 3, updatedAt: _now.AddDays(-1), ct: ct);

        await InsertIdempotencyKey(
            dataSource,
            key: "orphaned-key",
            ns: "test",
            workflowIds: [deletedWorkflowId],
            createdAt: _now.AddDays(-31),
            ct: ct
        );

        await InsertIdempotencyKey(
            dataSource,
            key: "active-key",
            ns: "test",
            workflowIds: [survivingWorkflowId],
            createdAt: _now.AddDays(-31),
            ct: ct
        );

        await InsertIdempotencyKey(
            dataSource,
            key: "recent-key",
            ns: "test",
            workflowIds: [deletedWorkflowId],
            createdAt: _now.AddDays(-1),
            ct: ct
        );

        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        await using var ctx = fixture.CreateDbContext();
        var remainingKeys = await ctx.IdempotencyKeys.Select(k => k.IdempotencyKey).ToListAsync(ct);

        Assert.DoesNotContain("orphaned-key", remainingKeys);
        Assert.Contains("active-key", remainingKeys);
        Assert.Contains("recent-key", remainingKeys);
    }

    [Fact]
    public async Task Retention_DeletesLastWorkflowInCollection_RemovesCollection()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var expiredHeadId = Guid.NewGuid();
        await InsertWorkflow(
            dataSource,
            expiredHeadId,
            status: 3,
            updatedAt: _now.AddDays(-31),
            collectionKey: "collection",
            ct: ct
        );
        await InsertCollection(dataSource, "collection", [expiredHeadId], updatedAt: _now.AddDays(-31), ct: ct);

        // Act
        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        Assert.False(await ctx.WorkflowCollections.AnyAsync(c => c.Key == "collection", ct));
        Assert.False(await ctx.Workflows.AnyAsync(w => w.Id == expiredHeadId, ct));
    }

    [Fact]
    public async Task Retention_DeletesOneCurrentHead_PreservesRemainingHeads()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var expiredHeadId = Guid.NewGuid();
        var retainedHeadId = Guid.NewGuid();
        await InsertWorkflow(
            dataSource,
            expiredHeadId,
            status: 3,
            updatedAt: _now.AddDays(-31),
            collectionKey: "collection",
            ct: ct
        );
        await InsertWorkflow(
            dataSource,
            retainedHeadId,
            status: 3,
            updatedAt: _now.AddDays(-1),
            collectionKey: "collection",
            ct: ct
        );
        await InsertCollection(
            dataSource,
            "collection",
            [expiredHeadId, retainedHeadId],
            updatedAt: _now.AddDays(-31),
            ct: ct
        );

        // Act
        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        var collection = await ctx.WorkflowCollections.SingleAsync(c => c.Key == "collection", ct);
        var head = Assert.Single(collection.Heads);
        Assert.Equal(retainedHeadId, head);
    }

    [Fact]
    public async Task Retention_RemovesCurrentHead_NextDependsOnHeadsEnqueueSucceeds()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        var repo = fixture.CreateRepository();
        var metadata = new WorkflowRequestMetadata("test-ns", Guid.NewGuid().ToString("N"), "collection", _now, null);

        var results = await WorkflowTestHelper.EnqueueWorkflows(
            repo,
            metadata,
            [CreateWorkflowRequest("expired")],
            ns: "test-ns"
        );
        var expiredHeadId = Assert.Single(results[0].WorkflowIds!);

        await using (var ctx = fixture.CreateDbContext())
        {
            await ctx.Database.ExecuteSqlAsync(
                $"UPDATE engine.workflows SET status = 3, updated_at = {_now.AddDays(-31)} WHERE id = {expiredHeadId}",
                ct
            );
        }

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        await RunRetention(dataSource, retentionPeriod: TimeSpan.FromDays(30), ct: ct);

        // Act
        var nextResults = await WorkflowTestHelper.EnqueueWorkflows(
            repo,
            metadata with
            {
                IdempotencyKey = Guid.NewGuid().ToString("N"),
            },
            [CreateWorkflowRequest("next")],
            ns: "test-ns"
        );

        // Assert
        var nextId = Assert.Single(nextResults[0].WorkflowIds!);
        Assert.Equal(BatchEnqueueResultStatus.Created, nextResults[0].Status);

        await using var assertCtx = fixture.CreateDbContext();
        var collection = await assertCtx.WorkflowCollections.SingleAsync(c => c.Key == "collection", ct);
        var head = Assert.Single(collection.Heads);
        Assert.Equal(nextId, head);

        var nextWorkflow = await assertCtx.Workflows.Include(w => w.Dependencies).SingleAsync(w => w.Id == nextId, ct);
        Assert.NotNull(nextWorkflow.Dependencies);
        Assert.Empty(nextWorkflow.Dependencies);
    }

    // --- Helpers ---

    private static async Task RunRetention(
        NpgsqlDataSource dataSource,
        TimeSpan retentionPeriod,
        int batchSize = 1000,
        CancellationToken ct = default
    )
    {
        var settings = new RetentionSettings
        {
            RetentionPeriod = retentionPeriod,
            BatchSize = batchSize,
            Interval = TimeSpan.FromSeconds(1),
        };

        var engineSettings = Options.Create(
            new EngineSettings
            {
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                DefaultStepRetryStrategy = null!,
                DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
                DatabaseRetryStrategy = null!,
                MetricsCollectionInterval = TimeSpan.FromSeconds(5),
                MaxWorkflowsPerRequest = 100,
                MaxStepsPerWorkflow = 50,
                MaxLabels = 50,
                HeartbeatInterval = TimeSpan.FromSeconds(3),
                StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
                MaxReclaimCount = 3,
                Retention = settings,
            }
        );

        using var limiter = new ConcurrencyLimiter(10, 10, 5);
        using var service = new DbMaintenanceService(
            NullLogger<DbMaintenanceService>.Instance,
            TimeProvider.System,
            dataSource,
            engineSettings,
            limiter
        );

        await service.PurgeExpiredWorkflows(_now, settings, ct);
    }

    private static async Task InsertWorkflow(
        NpgsqlDataSource dataSource,
        Guid id,
        int status,
        DateTimeOffset updatedAt,
        string? collectionKey = null,
        CancellationToken ct = default
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.workflows (id, operation_id, idempotency_key, namespace, status, created_at, updated_at, reclaim_count, collection_key)
            VALUES (@id, 'test-op', @id::text, 'test-ns', @status, @createdAt, @updatedAt, 0, @collectionKey)
            """
        );
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("createdAt", updatedAt.AddHours(-1));
        cmd.Parameters.AddWithValue("updatedAt", updatedAt);
        cmd.Parameters.AddWithValue("collectionKey", collectionKey is null ? DBNull.Value : collectionKey);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static WorkflowRequest CreateWorkflowRequest(string @ref) =>
        new()
        {
            Ref = @ref,
            OperationId = $"op-{@ref}",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };

    private static async Task InsertCollection(
        NpgsqlDataSource dataSource,
        string key,
        Guid[] heads,
        DateTimeOffset updatedAt,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.workflow_collections (key, namespace, heads, created_at, updated_at)
            VALUES (@key, 'test-ns', @heads, @createdAt, @updatedAt)
            """
        );
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("heads", heads);
        cmd.Parameters.AddWithValue("createdAt", updatedAt.AddHours(-1));
        cmd.Parameters.AddWithValue("updatedAt", updatedAt);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertStep(NpgsqlDataSource dataSource, Guid workflowId, CancellationToken ct)
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.steps (id, job_id, operation_id, command_json, status, created_at, processing_order, requeue_count)
            VALUES (@id, @jobId, 'test-step', '{"type":"webhook"}', 3, @createdAt, 0, 0)
            """
        );
        cmd.Parameters.AddWithValue("id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("jobId", workflowId);
        cmd.Parameters.AddWithValue("createdAt", _now.AddDays(-31));
        await cmd.ExecuteNonQueryAsync(ct);
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
            INSERT INTO engine.workflow_dependency (workflow_id, depends_on_workflow_id)
            VALUES (@workflowId, @dependsOnId)
            """
        );
        cmd.Parameters.AddWithValue("workflowId", workflowId);
        cmd.Parameters.AddWithValue("dependsOnId", dependsOnId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertLink(
        NpgsqlDataSource dataSource,
        Guid workflowId,
        Guid linkedWorkflowId,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.workflow_link (workflow_id, linked_workflow_id)
            VALUES (@workflowId, @linkedWorkflowId)
            """
        );
        cmd.Parameters.AddWithValue("workflowId", workflowId);
        cmd.Parameters.AddWithValue("linkedWorkflowId", linkedWorkflowId);
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
            INSERT INTO engine.idempotency_keys (idempotency_key, namespace, request_body_hash, workflow_ids, created_at)
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
