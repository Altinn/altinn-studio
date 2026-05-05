using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the two stale-handling sweeps in <c>DbMaintenanceService</c>:
/// <see cref="WorkflowEngine.Data.Services.DbMaintenanceService.ReclaimStaleWorkflows"/> and
/// <see cref="WorkflowEngine.Data.Services.DbMaintenanceService.AbandonStaleWorkflows"/>.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class StaleSweepTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Reclaim_StaleProcessingUnderLimit_IsResetToEnqueuedAndBumpsReclaimCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 0
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWf.Status);
        Assert.Equal(1, dbWf.ReclaimCount);
        Assert.Null(dbWf.HeartbeatAt);
        Assert.Null(dbWf.LeaseToken);
    }

    [Fact]
    public async Task Reclaim_FreshProcessing_IsNotTouched()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

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

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
        Assert.Equal(0, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task Reclaim_ProcessingWithNullHeartbeat_IsNotTouched()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        // HeartbeatAt remains NULL after InsertAndSetStatus

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        // Nothing becomes Enqueued.
        var fetched = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);
        Assert.Empty(fetched);
    }

    [Fact]
    public async Task Reclaim_AtOrAboveLimit_IsLeftForAbandon()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = {fixture.Settings.MaxReclaimCount}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
        Assert.Equal(fixture.Settings.MaxReclaimCount, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task Abandon_StaleProcessingAtOrAboveLimit_IsMarkedFailed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = {fixture.Settings.MaxReclaimCount}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.AbandonStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Failed, dbWf.Status);
        Assert.Null(dbWf.HeartbeatAt);
        Assert.Null(dbWf.LeaseToken);
    }

    [Fact]
    public async Task Abandon_StaleProcessingUnderLimit_IsNotTouched()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 0
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.AbandonStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Processing, dbWf.Status);
    }

    [Fact]
    public async Task Reclaim_IsIdempotent_SecondRunDoesNotBumpAgain()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 0
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );
        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWf.Status);
        Assert.Equal(1, dbWf.ReclaimCount);
    }

    [Fact]
    public async Task SweepThenFetch_ReclaimedRowSurfacesAsEnqueued()
    {
        // End-to-end: sweep resets a stale Processing row to Enqueued; the next fetch picks it up.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "HeartbeatAt" = {staleHeartbeat}, "ReclaimCount" = 1
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        var fetched = Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, fetched.DatabaseId);
        Assert.Equal(2, fetched.ReclaimCount);
        Assert.NotNull(fetched.LeaseToken);
    }

    [Fact]
    public async Task ProgressiveReclaim_EventuallyAbandons()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var maxReclaim = fixture.Settings.MaxReclaimCount;

        for (var i = 1; i <= maxReclaim; i++)
        {
            // Force row back into stale-Processing with the expected ReclaimCount and run reclaim.
            var staleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
            await context.Database.ExecuteSqlAsync(
                $"""
                UPDATE "engine"."Workflows"
                SET "Status" = {PersistentItemStatus.Processing},
                    "HeartbeatAt" = {staleHeartbeat},
                    "ReclaimCount" = {i - 1}
                WHERE "Id" = {wf.DatabaseId}
                """,
                TestContext.Current.CancellationToken
            );

            await maintenance.ReclaimStaleWorkflows(
                DateTimeOffset.UtcNow,
                fixture.Settings,
                TestContext.Current.CancellationToken
            );

            var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
            Assert.NotNull(dbWf);
            Assert.Equal(PersistentItemStatus.Enqueued, dbWf.Status);
            Assert.Equal(i, dbWf.ReclaimCount);
        }

        // One more stale Processing at the reclaim limit — abandon marks it Failed.
        var finalStaleHeartbeat = DateTimeOffset.UtcNow.AddSeconds(-30);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE "engine"."Workflows"
            SET "Status" = {PersistentItemStatus.Processing},
                "HeartbeatAt" = {finalStaleHeartbeat}
            WHERE "Id" = {wf.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.AbandonStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var abandonedWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(abandonedWf);
        Assert.Equal(PersistentItemStatus.Failed, abandonedWf.Status);
        Assert.Null(abandonedWf.HeartbeatAt);
        Assert.Null(abandonedWf.LeaseToken);
    }
}
