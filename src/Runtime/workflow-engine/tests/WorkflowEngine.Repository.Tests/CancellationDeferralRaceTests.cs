using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// The fetch gate's cancellation bypass: a pending cancellation makes an
/// Enqueued/Requeued/Waiting workflow claimable regardless of its backoff timer.
/// <c>RequestCancellation</c> clears <c>backoff_until</c> only when the row is already parked, so
/// without the bypass a cancel that raced a deferral/retry write-back (accepted while the row
/// still read Processing) would strand behind the backoff until the timer elapsed. The dependency
/// gate is not bypassed — see the fetch SQL for the plan-shaped reason.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class CancellationDeferralRaceTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task RequestCancellation_RacingDeferralWriteBack_WorkflowIsStillClaimedPromptly()
    {
        // Arrange — a workflow claimed for execution through the real fetch path: Processing,
        // leased, heartbeat stamped. This is the row state while a command is running (and until
        // the update buffer flushes the outcome).
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, ns, labels) = WorkflowTestHelper.CreateRequest();
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata, ns: ns, labels: labels);

        var claimed = Assert.Single(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));
        Assert.Equal(PersistentItemStatus.Processing, claimed.Status);

        // Act 1 — the cancel lands while the row still reads Processing: accepted, but the
        // backoff-clearing CASE does not apply because the row is not parked yet.
        var cancelAccepted = await repo.RequestCancellation(
            claimed.DatabaseId,
            ns,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );
        Assert.True(cancelAccepted);

        // Act 2 — the deferral write-back flushes: the exact mutation WorkflowHandler.ApplyDeferDecision
        // makes, persisted through the same repository call WorkflowUpdateBuffer.FlushBatch uses.
        var now = DateTimeOffset.UtcNow;
        var deferDelay = TimeSpan.FromMinutes(10);
        var step = Assert.Single(claimed.Steps);
        step.DeferCount++;
        step.FirstDeferredAt = now;
        step.LastDeferredAt = now;
        step.RequeueCount = 0;
        step.Status = PersistentItemStatus.Waiting;
        claimed.Status = PersistentItemStatus.Waiting;
        claimed.BackoffUntil = now.Add(deferDelay);

        var writeBack = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(claimed, [step])],
            TestContext.Current.CancellationToken
        );

        // The write-back wins cleanly — the pending cancel does not invalidate the lease.
        Assert.Equal([claimed.DatabaseId], writeBack.Accepted);
        Assert.Empty(writeBack.Rejected);

        // Assert — the workflow is parked behind a 10-minute backoff the cancel did not clear …
        var row = await context
            .Workflows.AsNoTracking()
            .Where(wf => wf.Id == claimed.DatabaseId)
            .Select(wf => new
            {
                wf.Status,
                wf.CancellationRequestedAt,
                wf.BackoffUntil,
                wf.LeaseToken,
            })
            .SingleAsync(TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Waiting, row.Status);
        Assert.NotNull(row.CancellationRequestedAt);
        Assert.NotNull(row.BackoffUntil);
        Assert.Null(row.LeaseToken);

        // … but the pending cancellation makes it claimable anyway, so the next fetch cycle hands
        // it to a handler that will mark it Canceled instead of leaving it to wait out the timer.
        var refetched = Assert.Single(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));
        Assert.Equal(claimed.DatabaseId, refetched.DatabaseId);
        Assert.NotNull(refetched.CancellationRequestedAt);
        Assert.Equal(PersistentItemStatus.Processing, refetched.Status);
    }

    [Theory]
    [InlineData(PersistentItemStatus.Waiting)]
    [InlineData(PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.Enqueued)]
    public async Task FetchAndLock_PendingCancellationWithFutureBackoff_IsClaimedDespiteTheTimer(
        PersistentItemStatus status
    )
    {
        // The cancellation flag is stamped via raw SQL because this is exactly the race artifact:
        // RequestCancellation clears the backoff of an already-parked row, so a parked row holding
        // both a flag and a timer can only come from a cancel that raced a write-back (or, for
        // Enqueued, from backoff_until carrying a future StartAt).
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, status);

        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET backoff_until = {DateTimeOffset.UtcNow.AddDays(7)},
                cancellation_requested_at = {DateTimeOffset.UtcNow},
                lease_token = NULL
            WHERE id = {workflow.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var fetched = Assert.Single(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));

        Assert.Equal(workflow.DatabaseId, fetched.DatabaseId);
        Assert.NotNull(fetched.CancellationRequestedAt);
    }

    [Fact]
    public async Task FetchAndLock_PendingCancellationWithUnsettledDependency_StaysParkedOnTheGate()
    {
        // The cancellation bypass covers the backoff gate only (see the fetch SQL for why the
        // dependency gate stays): a cancelled dependent keeps waiting and is cancelled when its
        // dependency settles. If the gate ever learns to claim these rows cheaply, flip this test.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");
        var dependency = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Waiting,
            ns: ns
        );
        var dependent = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            ns: ns,
            dependencies: [dependency.DatabaseId]
        );

        // Park the dependency behind a timer so it is not claimable itself, then verify the gate
        // holds the dependent back.
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET backoff_until = {DateTimeOffset.UtcNow.AddDays(7)} WHERE id = {dependency.DatabaseId}",
            TestContext.Current.CancellationToken
        );
        Assert.Empty(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));

        var cancelAccepted = await repo.RequestCancellation(
            dependent.DatabaseId,
            ns,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );
        Assert.True(cancelAccepted);

        // The pending cancellation does not open the dependency gate …
        Assert.Empty(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));

        // … but once the dependency settles, the next fetch claims the dependent with the flag
        // intact, and the handler cancels it.
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET status = {(int)PersistentItemStatus.Completed}, backoff_until = NULL, lease_token = NULL
            WHERE id = {dependency.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        var fetched = Assert.Single(await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken));

        Assert.Equal(dependent.DatabaseId, fetched.DatabaseId);
        Assert.NotNull(fetched.CancellationRequestedAt);
    }
}
