using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class FetchAndLockTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromSeconds(15);
    private const int MaxReclaimCount = 3;

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task FetchAndLock_ReturnsEnqueuedWorkflows()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Single(result.Workflows);
        Assert.Equal(wf.DatabaseId, result.Workflows[0].DatabaseId);
        Assert.Equal(0, result.ReclaimedCount);
        Assert.Equal(0, result.AbandonedCount);

        // Verify the workflow was set to Processing with a heartbeat
        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
        Assert.NotNull(dbWf.HeartbeatAt);
        Assert.Equal(0, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task FetchAndLock_SkipsCompletedAndFailed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed);

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.ReclaimedCount);
        Assert.Equal(0, result.AbandonedCount);
    }

    [Fact]
    public async Task FetchAndLock_RespectsCountLimit()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        for (var i = 0; i < 5; i++)
        {
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);
        }

        var result = await repo.FetchAndLockWorkflows(
            2,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(2, result.Workflows.Count);
    }

    [Fact]
    public async Task FetchAndLock_ReclaimsStaleProcessingWorkflow()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create a workflow and simulate it being stuck in Processing with an old heartbeat
        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Single(result.Workflows);
        Assert.Equal(wf.DatabaseId, result.Workflows[0].DatabaseId);
        Assert.Equal(1, result.ReclaimedCount);
        Assert.Equal(0, result.AbandonedCount);

        // Verify ReclaimCount was incremented and heartbeat refreshed
        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
        Assert.Equal(1, dbWf.ReclaimCount);
        Assert.NotNull(dbWf.HeartbeatAt);
        Assert.True(dbWf.HeartbeatAt > staleHeartbeat);
    }

    [Fact]
    public async Task FetchAndLock_DoesNotReclaimFreshProcessingWorkflow()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create a workflow in Processing with a recent heartbeat (not stale)
        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var freshHeartbeat = DateTimeOffset.UtcNow;
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {freshHeartbeat}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.ReclaimedCount);
    }

    [Fact]
    public async Task FetchAndLock_AbandonsWorkflowExceedingReclaimLimit()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create a workflow that's already been reclaimed MaxReclaimCount times
        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = {MaxReclaimCount}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        // Should not be returned as a reclaimed workflow
        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.ReclaimedCount);
        Assert.Equal(1, result.AbandonedCount);

        // Verify it was marked as Failed
        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Failed, dbWf.Status);
        Assert.Null(dbWf.HeartbeatAt);
        Assert.Equal(MaxReclaimCount, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task FetchAndLock_ReclaimsAndAbandonsInSameCall()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);

        // Workflow 1: stale but under reclaim limit → should be reclaimed
        var reclaimable = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 1
            WHERE "Id" = {reclaimable.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        // Workflow 2: stale and at reclaim limit → should be abandoned
        var abandonable = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = {MaxReclaimCount}
            WHERE "Id" = {abandonable.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        // Workflow 3: enqueued → should be fetched normally
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        // 2 workflows returned: the reclaimable one + the enqueued one
        Assert.Equal(2, result.Workflows.Count);
        Assert.Contains(result.Workflows, w => w.DatabaseId == reclaimable.DatabaseId);
        Assert.Contains(result.Workflows, w => w.DatabaseId == enqueued.DatabaseId);
        Assert.Equal(1, result.ReclaimedCount);
        Assert.Equal(1, result.AbandonedCount);

        // Verify abandoned workflow is Failed
        var dbAbandoned = await fixture.GetWorkflow(abandonable.DatabaseId);
        Assert.NotNull(dbAbandoned);
        Assert.Equal(PersistentItemStatus.Failed, dbAbandoned.Status);
    }

    [Fact]
    public async Task BatchUpdateHeartbeats_UpdatesHeartbeatTimestamp()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var initialHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-10);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {initialHeartbeat}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await repo.BatchUpdateHeartbeats([wf.DatabaseId], TestContext.Current.CancellationToken);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.NotNull(dbWf.HeartbeatAt);
        Assert.True(dbWf.HeartbeatAt > initialHeartbeat);
    }

    [Fact]
    public async Task BatchUpdateHeartbeats_OnlyUpdatesProcessingWorkflows()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create one Processing and one Completed workflow
        var processing = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var completed = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        var oldHeartbeat = DateTimeOffset.UtcNow.AddMinutes(-5);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {oldHeartbeat}
            WHERE "Id" IN ({processing.DatabaseId}, {completed.DatabaseId})
            """,
            TestContext.Current.CancellationToken
        );

        await repo.BatchUpdateHeartbeats(
            [processing.DatabaseId, completed.DatabaseId],
            TestContext.Current.CancellationToken
        );

        var dbProcessing = await fixture.GetWorkflow(processing.DatabaseId);
        var dbCompleted = await fixture.GetWorkflow(completed.DatabaseId);

        Assert.NotNull(dbProcessing);
        Assert.NotNull(dbProcessing.HeartbeatAt);
        Assert.True(dbProcessing.HeartbeatAt > oldHeartbeat);

        // Completed workflow should not have been updated
        Assert.NotNull(dbCompleted);
        Assert.NotNull(dbCompleted.HeartbeatAt);
        Assert.Equal(oldHeartbeat.ToUnixTimeSeconds(), dbCompleted.HeartbeatAt.Value.ToUnixTimeSeconds());
    }

    [Fact]
    public async Task FetchAndLock_DoesNotReclaimProcessingWithNullHeartbeat()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Workflow in Processing with no heartbeat (legacy or just picked up)
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        // HeartbeatAt is NULL by default after InsertAndSetStatus

        var result = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Workflows);
        Assert.Equal(0, result.ReclaimedCount);
        Assert.Equal(0, result.AbandonedCount);
    }

    [Fact]
    public async Task FetchAndLock_ProgressiveReclaim_EventuallyAbandons()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create a "poison" workflow that keeps going stale
        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        // Each iteration reclaims the workflow (incrementing ReclaimCount).
        // After MaxReclaimCount reclaims, one more fetch will abandon it.
        for (var i = 1; i <= MaxReclaimCount; i++)
        {
            // Simulate the worker crashing: set a stale heartbeat
            var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
            await context.Database.ExecuteSqlAsync(
                $"""
                UPDATE "engine"."Workflows"
                SET "HeartbeatAt" = {staleHeartbeat}
                WHERE "Id" = {wf.DatabaseId}
                """,
                TestContext.Current.CancellationToken
            );

            var result = await repo.FetchAndLockWorkflows(
                10,
                StaleThreshold,
                MaxReclaimCount,
                TestContext.Current.CancellationToken
            );

            // Should be reclaimed each time (ReclaimCount goes from 0→1, 1→2, 2→3)
            Assert.Single(result.Workflows);
            Assert.Equal(1, result.ReclaimedCount);
            Assert.Equal(0, result.AbandonedCount);

            var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
            Assert.NotNull(dbWf);
            Assert.Equal(i, dbWf.ReclaimCount);
        }

        // Now ReclaimCount == MaxReclaimCount. One more stale check should abandon it.
        var finalStaleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {finalStaleHeartbeat}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var finalResult = await repo.FetchAndLockWorkflows(
            10,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Empty(finalResult.Workflows);
        Assert.Equal(0, finalResult.ReclaimedCount);
        Assert.Equal(1, finalResult.AbandonedCount);

        var abandonedWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(abandonedWf);
        Assert.Equal(PersistentItemStatus.Failed, abandonedWf.Status);
        Assert.Null(abandonedWf.HeartbeatAt);
    }

    [Fact]
    public async Task FetchAndLock_CapsTotal_ReadyPlusStaleNeverExceedsCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Insert 3 ready workflows
        for (var i = 0; i < 3; i++)
        {
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);
        }

        // Insert 3 stale workflows (Processing with old heartbeat)
        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        for (var i = 0; i < 3; i++)
        {
            var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
            await context.Database.ExecuteSqlAsync(
                $"""
                UPDATE "engine"."Workflows"
                SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 0
                WHERE "Id" = {wf.DatabaseId}
                """,
                TestContext.Current.CancellationToken
            );
        }

        // Request count=4 — should get at most 4 total (3 ready + 1 stale), not 3+3=6
        var result = await repo.FetchAndLockWorkflows(
            4,
            StaleThreshold,
            MaxReclaimCount,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(4, result.Workflows.Count);
        Assert.Equal(1, result.ReclaimedCount);
    }
}
