using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class LeaseTokenTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    // ----- Fetch issues fresh lease tokens -----

    [Fact]
    public async Task FetchAndLock_IssuesLeaseToken_OnFreshFetch()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);
        Assert.Null(enqueued.LeaseToken);

        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        var fetched = Assert.Single(workflows);
        Assert.NotNull(fetched.LeaseToken);

        var dbWf = await fixture.GetWorkflow(enqueued.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(fetched.LeaseToken, dbWf.LeaseToken);
    }

    [Fact]
    public async Task FetchAndLock_IssuesFreshLeaseToken_AfterReclaim()
    {
        // Reclaim now happens in DbMaintenanceService — it resets the row to Enqueued
        // and the next fetch stamps a new LeaseToken.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var tokenBefore = wf.LeaseToken;

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

        var reclaimed = Assert.Single(workflows);
        Assert.NotEqual(tokenBefore, reclaimed.LeaseToken);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(reclaimed.LeaseToken, dbWf.LeaseToken);
        Assert.Equal(2, dbWf.ReclaimCount);
    }

    // ----- Heartbeat honors lease token -----

    [Fact]
    public async Task BatchUpdateHeartbeats_WithStaleLeaseToken_DoesNotUpdateHeartbeat()
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

        await repo.BatchUpdateHeartbeats(
            [(wf.DatabaseId, Guid.NewGuid())],
            TimeSpan.FromSeconds(10),
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(pastTime.ToUnixTimeSeconds(), dbWf.HeartbeatAt!.Value.ToUnixTimeSeconds());
    }

    [Fact]
    public async Task BatchUpdateHeartbeats_WithMatchingLeaseToken_UpdatesHeartbeat()
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

        await repo.BatchUpdateHeartbeats(
            [(wf.DatabaseId, wf.LeaseToken!.Value)],
            TimeSpan.FromSeconds(10),
            TestContext.Current.CancellationToken
        );

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.True(dbWf.HeartbeatAt > pastTime);
    }

    // ----- Write-back honors lease token -----

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WithMatchingLeaseToken_Accepts()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        wf.Status = PersistentItemStatus.Completed;

        var result = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(wf, [])],
            TestContext.Current.CancellationToken
        );

        Assert.Single(result.Accepted);
        Assert.Equal(wf.DatabaseId, result.Accepted[0]);
        Assert.Empty(result.Rejected);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Completed, dbWf.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WithStaleLeaseToken_Rejects_AndDoesNotModifyRow()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var originalStatus = (await fixture.GetWorkflow(wf.DatabaseId))!.Status;

        // Caller sends a stale token — simulates a reclaimed-out zombie worker
        wf.LeaseToken = Guid.NewGuid();
        wf.Status = PersistentItemStatus.Completed;

        var result = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(wf, [])],
            TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Accepted);
        Assert.Single(result.Rejected);
        Assert.Equal(wf.DatabaseId, result.Rejected[0]);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(originalStatus, dbWf.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_MixedBatch_PartiallyAccepts()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var good = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var stale = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);

        good.Status = PersistentItemStatus.Completed;
        stale.LeaseToken = Guid.NewGuid();
        stale.Status = PersistentItemStatus.Completed;

        var result = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(good, []), new BatchWorkflowStatusUpdate(stale, [])],
            TestContext.Current.CancellationToken
        );

        Assert.Single(result.Accepted);
        Assert.Equal(good.DatabaseId, result.Accepted[0]);
        Assert.Single(result.Rejected);
        Assert.Equal(stale.DatabaseId, result.Rejected[0]);

        Assert.Equal(PersistentItemStatus.Completed, (await fixture.GetWorkflow(good.DatabaseId))!.Status);
        Assert.Equal(PersistentItemStatus.Processing, (await fixture.GetWorkflow(stale.DatabaseId))!.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_RejectedWorkflow_DoesNotWriteItsSteps()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var step = wf.Steps.Single();
        var originalStepStatus = step.Status;

        // Mutate both workflow and step state, then swap the lease token
        wf.LeaseToken = Guid.NewGuid();
        wf.Status = PersistentItemStatus.Completed;
        step.Status = PersistentItemStatus.Completed;

        var result = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(wf, [step])],
            TestContext.Current.CancellationToken
        );

        Assert.Empty(result.Accepted);
        Assert.Single(result.Rejected);

        // The step must not have been written — it belongs to a workflow we no longer own.
        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        var dbStep = Assert.Single(dbWf.Steps);
        Assert.Equal(originalStepStatus, dbStep.Status);
    }
}
