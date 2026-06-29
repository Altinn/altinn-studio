using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the dependency-recovery sweep in <c>DbMaintenanceService</c>
/// (<see cref="WorkflowEngine.Data.Services.DbMaintenanceService.RecoverDependencyResolvedWorkflows"/>):
/// a workflow stuck in <see cref="PersistentItemStatus.DependencyFailed"/> is re-enqueued once all of
/// its dependencies have completed, but stays parked while any dependency is still Failed or Canceled.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class DependencyRecoverySweepTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Recover_DependencyFailed_WithCompletedDependency_IsReEnqueued()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var ns = Guid.NewGuid().ToString("N");

        var parent = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        var child = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [parent.DatabaseId]
        );

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbChild = await fixture.GetWorkflow(child.DatabaseId);
        Assert.NotNull(dbChild);
        Assert.Equal(PersistentItemStatus.Enqueued, dbChild.Status);
        Assert.Null(dbChild.LeaseToken);
    }

    [Fact]
    public async Task Recover_ReEnqueuedChild_SurfacesAsFetchable()
    {
        // End-to-end: the sweep re-enqueues the resolved child; the next fetch picks it up.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var ns = Guid.NewGuid().ToString("N");

        var parent = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        var child = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [parent.DatabaseId]
        );

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var fetched = await repo.FetchAndLockWorkflows(10, TestContext.Current.CancellationToken);
        Assert.Contains(fetched, w => w.DatabaseId == child.DatabaseId);
    }

    [Fact]
    public async Task Recover_DependencyFailed_WithFailedDependency_IsNotTouched()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var ns = Guid.NewGuid().ToString("N");

        var parent = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);
        var child = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [parent.DatabaseId]
        );

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbChild = await fixture.GetWorkflow(child.DatabaseId);
        Assert.NotNull(dbChild);
        Assert.Equal(PersistentItemStatus.DependencyFailed, dbChild.Status);
    }

    [Fact]
    public async Task Recover_DependencyFailed_WithCanceledDependency_IsNotTouched()
    {
        // Cancellation is intentional and terminal — a canceled dependency must keep dependents parked.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var ns = Guid.NewGuid().ToString("N");

        var parent = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Canceled, ns: ns);
        var child = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [parent.DatabaseId]
        );

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbChild = await fixture.GetWorkflow(child.DatabaseId);
        Assert.NotNull(dbChild);
        Assert.Equal(PersistentItemStatus.DependencyFailed, dbChild.Status);
    }

    [Fact]
    public async Task Recover_DependencyFailed_WithMixedDependencies_IsNotTouchedUntilAllComplete()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var ns = Guid.NewGuid().ToString("N");

        var completedParent = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            ns: ns
        );
        var failedParent = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            ns: ns
        );
        var child = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [completedParent.DatabaseId, failedParent.DatabaseId]
        );

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbChild = await fixture.GetWorkflow(child.DatabaseId);
        Assert.NotNull(dbChild);
        Assert.Equal(PersistentItemStatus.DependencyFailed, dbChild.Status);
    }

    [Fact]
    public async Task Recover_DependencyFailed_WithNoDependencies_IsNotTouched()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var orphan = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.DependencyFailed);

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbOrphan = await fixture.GetWorkflow(orphan.DatabaseId);
        Assert.NotNull(dbOrphan);
        Assert.Equal(PersistentItemStatus.DependencyFailed, dbOrphan.Status);
    }
}
