using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class FetchAndLockTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task FetchAndLock_ReturnsEnqueuedWorkflows()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, workflows[0].DatabaseId);

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

        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        Assert.Empty(workflows);
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

        var workflows = await repo.FetchAndLockWorkflows(2, TestContext.Current.CancellationToken);

        Assert.Equal(2, workflows.Count);
    }

    [Fact]
    public async Task FetchAndLock_DoesNotPickUpStaleProcessingRows()
    {
        // Fetch no longer reclaims — stale Processing rows are left for the maintenance sweep.
        // A fresh Processing row (no heartbeat or recent heartbeat) is also not fetched.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

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

        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        Assert.Empty(workflows);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
        Assert.Equal(0, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task BatchUpdateHeartbeats_UpdatesHeartbeatTimestamp()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var pastTime = DateTimeOffset.UtcNow.AddMinutes(-5);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {pastTime}, "UpdatedAt" = {pastTime}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var staleThreshold = TimeSpan.FromSeconds(10);
        await repo.BatchUpdateHeartbeats(
            [(wf.DatabaseId, wf.LeaseToken!.Value)],
            staleThreshold,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.NotNull(dbWf.HeartbeatAt);
        Assert.True(dbWf.HeartbeatAt > pastTime);
    }

    [Fact]
    public async Task BatchUpdateHeartbeats_OnlyUpdatesProcessingWorkflows()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Create one Processing and one Completed workflow
        var processing = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var completed = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        var pastTime = DateTimeOffset.UtcNow.AddMinutes(-5);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {pastTime}, "UpdatedAt" = {pastTime}
            WHERE "Id" IN ({processing.DatabaseId}, {completed.DatabaseId})
            """,
            TestContext.Current.CancellationToken
        );

        var staleThreshold = TimeSpan.FromSeconds(10);
        await repo.BatchUpdateHeartbeats(
            [
                (processing.DatabaseId, processing.LeaseToken!.Value),
                (completed.DatabaseId, completed.LeaseToken!.Value),
            ],
            staleThreshold,
            TestContext.Current.CancellationToken
        );

        var dbProcessing = await fixture.GetWorkflow(processing.DatabaseId);
        var dbCompleted = await fixture.GetWorkflow(completed.DatabaseId);

        Assert.NotNull(dbProcessing);
        Assert.NotNull(dbProcessing.HeartbeatAt);
        Assert.True(dbProcessing.HeartbeatAt > pastTime);

        // Completed workflow should not have been updated
        Assert.NotNull(dbCompleted);
        Assert.NotNull(dbCompleted.HeartbeatAt);
        Assert.Equal(pastTime.ToUnixTimeSeconds(), dbCompleted.HeartbeatAt.Value.ToUnixTimeSeconds());
    }
}
