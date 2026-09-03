using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Tests the <c>throttled_until</c> fetch gate: with throttling enabled the fetch skips workflows
/// parked behind a future <c>throttled_until</c>, while past or null values do not gate, and a
/// pending cancellation bypasses the gate outright. With throttling disabled the gate's
/// <c>@throttle_gate</c> parameter switches it off, so the column is fully inert ("disabled means
/// inert").
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ThrottleGateTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private IOptions<EngineSettings> ThrottlingEnabledSettings =>
        Options.Create(fixture.Settings with { Throttling = new ThrottlingSettings { Enabled = true } });

    private static async Task SetThrottledUntil(
        Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade database,
        Guid workflowId,
        DateTimeOffset throttledUntil
    ) =>
        await database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET throttled_until = {throttledUntil} WHERE id = {workflowId}",
            TestContext.Current.CancellationToken
        );

    [Fact]
    public async Task FetchAndLock_ThrottlingEnabled_FutureThrottledUntil_IsNotFetched()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(ThrottlingEnabledSettings);

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await SetThrottledUntil(context.Database, wf.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(10));

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        Assert.Empty(workflows);

        var dbWf = await fixture.GetWorkflow(wf.DatabaseId);
        Assert.NotNull(dbWf);
        Assert.Equal(PersistentItemStatus.Requeued, dbWf.Status);
    }

    [Fact]
    public async Task FetchAndLock_ThrottlingEnabled_PastThrottledUntil_IsFetched()
    {
        // Arrange — a throttle window that has elapsed must release by natural time elapse,
        // without requiring an explicit clear.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(ThrottlingEnabledSettings);

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await SetThrottledUntil(context.Database, wf.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(-1));

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        var fetched = Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, fetched.DatabaseId);
    }

    [Fact]
    public async Task FetchAndLock_ThrottlingEnabled_NullThrottledUntil_IsFetched()
    {
        // Arrange
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(ThrottlingEnabledSettings);

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        var fetched = Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, fetched.DatabaseId);
    }

    [Fact]
    public async Task FetchAndLock_ThrottlingDisabled_FutureThrottledUntil_IsIgnored()
    {
        // Arrange — the fixture's default settings leave Throttling.Enabled = false, so the
        // repository passes @throttle_gate = false and the throttled_until predicate never binds.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await SetThrottledUntil(context.Database, wf.DatabaseId, DateTimeOffset.UtcNow.AddMinutes(10));

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        var fetched = Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, fetched.DatabaseId);
    }

    [Fact]
    public async Task FetchAndLock_ThrottlingEnabled_PendingCancellation_BypassesThrottleGate()
    {
        // Arrange — a cancelled workflow parked behind a future throttled_until must still be
        // claimed: RequestCancellation never clears that column, and it documents the fetch gate
        // as what makes cancellation prompt. The handler cancels before executing anything, so
        // claiming the row costs the throttled namespace no downstream call.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(ThrottlingEnabledSettings);

        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await SetThrottledUntil(context.Database, wf.DatabaseId, DateTimeOffset.UtcNow.AddHours(1));

        Assert.True(
            await repo.RequestCancellation(
                wf.DatabaseId,
                wf.Namespace,
                DateTimeOffset.UtcNow,
                TestContext.Current.CancellationToken
            )
        );

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        var fetched = Assert.Single(workflows);
        Assert.Equal(wf.DatabaseId, fetched.DatabaseId);
        Assert.NotNull(fetched.ThrottledUntil);
    }

    [Fact]
    public async Task FetchAndLock_ThrottledUntil_RoundTripsThroughFetchedDomainModel()
    {
        // Arrange — the fetched workflow must carry the column so write-backs preserve it.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(ThrottlingEnabledSettings);

        var throttledUntil = DateTimeOffset.UtcNow.AddMinutes(-5);
        var wf = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await SetThrottledUntil(context.Database, wf.DatabaseId, throttledUntil);

        // Act
        var workflows = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);

        // Assert
        var fetched = Assert.Single(workflows);
        Assert.NotNull(fetched.ThrottledUntil);
        Assert.Equal(throttledUntil.ToUnixTimeMilliseconds(), fetched.ThrottledUntil.Value.ToUnixTimeMilliseconds());
    }
}
