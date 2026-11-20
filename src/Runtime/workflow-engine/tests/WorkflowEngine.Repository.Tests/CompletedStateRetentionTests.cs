using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class CompletedStateRetentionTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _now = new(2026, 3, 19, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan _statePeriod = TimeSpan.FromDays(7);
    private const string State = """{"instance":{"id":"1337/a"},"formData":"secret"}""";

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
    public async Task ClearExpiredCompletedState_CompletedPastThePeriod_ClearsTheStateAndKeepsTheRest()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, PersistentItemStatus.Completed, _now.AddDays(-8), ct);
        await InsertStep(dataSource, workflowId, processingOrder: 0, ct);
        await InsertStep(dataSource, workflowId, processingOrder: 1, ct);
        await InsertIdempotencyKey(dataSource, "completed-key", [workflowId], _now.AddDays(-8), ct);

        // Act
        await RunStateRetention(dataSource, ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        var workflow = await ctx.Workflows.SingleAsync(w => w.Id == workflowId, ct);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
        Assert.Null(workflow.InitialState);
        Assert.Equal(_now, workflow.StateClearedAt);

        var steps = await ctx.Steps.Where(s => s.JobId == workflowId).ToListAsync(ct);
        Assert.Equal(2, steps.Count);
        Assert.All(steps, step => Assert.Null(step.StateOut));
        Assert.All(steps, step => Assert.Equal(PersistentItemStatus.Completed, step.Status));

        Assert.True(await ctx.IdempotencyKeys.AnyAsync(k => k.IdempotencyKey == "completed-key", ct));
    }

    [Fact]
    public async Task ClearExpiredCompletedState_CompletedWithinThePeriod_KeepsTheState()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, PersistentItemStatus.Completed, _now.AddDays(-6), ct);
        await InsertStep(dataSource, workflowId, processingOrder: 0, ct);

        // Act
        await RunStateRetention(dataSource, ct: ct);

        // Assert
        await AssertStateKept(workflowId, ct);
    }

    [Theory]
    [InlineData(PersistentItemStatus.Failed)]
    [InlineData(PersistentItemStatus.Canceled)]
    [InlineData(PersistentItemStatus.DependencyFailed)]
    [InlineData(PersistentItemStatus.Abandoned)]
    [InlineData(PersistentItemStatus.Enqueued)]
    [InlineData(PersistentItemStatus.Processing)]
    [InlineData(PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.Waiting)]
    [InlineData(PersistentItemStatus.Held)]
    public async Task ClearExpiredCompletedState_NotCompleted_KeepsTheStateAResumeRunsFrom(PersistentItemStatus status)
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, status, _now.AddDays(-30), ct);
        await InsertStep(dataSource, workflowId, processingOrder: 0, ct);

        // Act
        await RunStateRetention(dataSource, ct: ct);

        // Assert
        await AssertStateKept(workflowId, ct);
    }

    [Fact]
    public async Task ClearExpiredCompletedState_PredecessorOfAnUnfinishedDependent_IsClearedAndTheDependentKeepsItsOwn()
    {
        // A dependent runs from the initial state it was enqueued with, never from its predecessor's, so a
        // dependent that is still running does not hold the predecessor's state back.

        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var predecessorId = Guid.NewGuid();
        await InsertWorkflow(dataSource, predecessorId, PersistentItemStatus.Completed, _now.AddDays(-8), ct);
        await InsertStep(dataSource, predecessorId, processingOrder: 0, ct);

        var dependentId = Guid.NewGuid();
        await InsertWorkflow(dataSource, dependentId, PersistentItemStatus.Processing, _now, ct);
        await InsertStep(dataSource, dependentId, processingOrder: 0, ct);
        await InsertDependency(dataSource, workflowId: dependentId, dependsOnId: predecessorId, ct);

        // Act
        await RunStateRetention(dataSource, ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        var predecessor = await ctx.Workflows.SingleAsync(w => w.Id == predecessorId, ct);
        Assert.Null(predecessor.InitialState);
        Assert.Null((await ctx.Steps.SingleAsync(s => s.JobId == predecessorId, ct)).StateOut);

        await AssertStateKept(dependentId, ct);
    }

    [Fact]
    public async Task ClearExpiredCompletedState_DrainsAllEligibleWorkflows_InBatches()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        for (var i = 0; i < 5; i++)
        {
            var workflowId = Guid.NewGuid();
            await InsertWorkflow(dataSource, workflowId, PersistentItemStatus.Completed, _now.AddDays(-8 - i), ct);
            await InsertStep(dataSource, workflowId, processingOrder: 0, ct);
        }

        // Act
        await RunStateRetention(dataSource, batchSize: 2, ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        Assert.Equal(5, await ctx.Workflows.CountAsync(ct));
        Assert.False(await ctx.Workflows.AnyAsync(w => w.InitialState != null || w.StateClearedAt == null, ct));
        Assert.False(await ctx.Steps.AnyAsync(s => s.StateOut != null, ct));
    }

    [Fact]
    public async Task ClearExpiredCompletedState_WithAZeroBatchSize_EndsTheSweepInsteadOfSpinningForever()
    {
        // Arrange
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));
        var ct = cts.Token;

        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);
        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, PersistentItemStatus.Completed, _now.AddDays(-8), ct);

        // Act
        try
        {
            await RunStateRetention(dataSource, batchSize: 0, ct: ct);
        }
        catch (OperationCanceledException)
        {
            Assert.Fail("ClearExpiredCompletedState was still running ten seconds in at BatchSize == 0.");
        }

        // Assert
        await AssertStateKept(workflowId, TestContext.Current.CancellationToken, hasSteps: false);
    }

    [Fact]
    public async Task ClearExpiredCompletedState_AlreadyCleared_IsLeftAloneByTheNextSweep()
    {
        // Arrange
        var ct = TestContext.Current.CancellationToken;
        await using var dataSource = NpgsqlDataSource.Create(fixture.ConnectionString);

        var workflowId = Guid.NewGuid();
        await InsertWorkflow(dataSource, workflowId, PersistentItemStatus.Completed, _now.AddDays(-8), ct);
        await RunStateRetention(dataSource, ct: ct);

        // Act
        await RunStateRetention(dataSource, now: _now.AddHours(2), ct: ct);

        // Assert
        await using var ctx = fixture.CreateDbContext();
        var workflow = await ctx.Workflows.SingleAsync(w => w.Id == workflowId, ct);
        Assert.Equal(_now, workflow.StateClearedAt);
    }

    private async Task AssertStateKept(Guid workflowId, CancellationToken ct, bool hasSteps = true)
    {
        await using var ctx = fixture.CreateDbContext();
        var workflow = await ctx.Workflows.SingleAsync(w => w.Id == workflowId, ct);
        Assert.Equal(State, workflow.InitialState);
        Assert.Null(workflow.StateClearedAt);

        if (hasSteps)
        {
            var step = await ctx.Steps.SingleAsync(s => s.JobId == workflowId, ct);
            Assert.Equal(State, step.StateOut);
        }
    }

    private static async Task RunStateRetention(
        NpgsqlDataSource dataSource,
        int batchSize = 1000,
        DateTimeOffset? now = null,
        CancellationToken ct = default
    )
    {
        var settings = new RetentionSettings
        {
            RetentionPeriod = TimeSpan.FromDays(90),
            CompletedStateRetentionPeriod = _statePeriod,
            BatchSize = batchSize,
            Interval = TimeSpan.FromSeconds(1),
        };

        var engineSettings = Options.Create(
            new EngineSettings
            {
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                MaxStepCommandTimeout = TimeSpan.FromHours(2),
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

        await service.ClearExpiredCompletedState(now ?? _now, settings, ct);
    }

    private static async Task InsertWorkflow(
        NpgsqlDataSource dataSource,
        Guid id,
        PersistentItemStatus status,
        DateTimeOffset updatedAt,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.workflows (id, operation_id, idempotency_key, namespace, status, created_at, updated_at, reclaim_count, initial_state)
            VALUES (@id, 'test-op', @id::text, 'test-ns', @status, @createdAt, @updatedAt, 0, @state)
            """
        );
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("status", (int)status);
        cmd.Parameters.AddWithValue("createdAt", updatedAt.AddHours(-1));
        cmd.Parameters.AddWithValue("updatedAt", updatedAt);
        cmd.Parameters.AddWithValue("state", State);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertStep(
        NpgsqlDataSource dataSource,
        Guid workflowId,
        int processingOrder,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.steps (id, job_id, operation_id, command_json, status, created_at, processing_order, requeue_count, state_out)
            VALUES (@id, @jobId, 'test-step', '{"type":"webhook"}', 3, @createdAt, @processingOrder, 0, @state)
            """
        );
        cmd.Parameters.AddWithValue("id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("jobId", workflowId);
        cmd.Parameters.AddWithValue("createdAt", _now.AddDays(-31));
        cmd.Parameters.AddWithValue("processingOrder", processingOrder);
        cmd.Parameters.AddWithValue("state", State);
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

    private static async Task InsertIdempotencyKey(
        NpgsqlDataSource dataSource,
        string key,
        Guid[] workflowIds,
        DateTimeOffset createdAt,
        CancellationToken ct
    )
    {
        await using var cmd = dataSource.CreateCommand(
            """
            INSERT INTO engine.idempotency_keys (idempotency_key, namespace, request_body_hash, workflow_ids, created_at)
            VALUES (@key, 'test-ns', @hash, @workflowIds, @createdAt)
            """
        );
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("hash", new byte[] { 0x01 });
        cmd.Parameters.AddWithValue("workflowIds", workflowIds);
        cmd.Parameters.AddWithValue("createdAt", createdAt);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
