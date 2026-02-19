using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Integration.Tests.Helpers;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

[Collection(PostgresCollection.Name)]
public sealed class DependencyCascadeTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<int> RunCascade()
    {
        await using var context = fixture.CreateDbContext();
        // The function returns an integer; use ExecuteSqlRaw + query to get the result
        var result = await context
            .Database.SqlQueryRaw<int>("SELECT cascade_dependency_failures() AS \"Value\"")
            .FirstAsync();

        return result;
    }

    [Fact]
    public async Task DirectDependentMarkedAsDependencyFailed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: failed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );

        // B: enqueued, depends on A
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo2.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(1, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        var bStatus = await verifyRepo.GetWorkflowStatus(workflowB.DatabaseId, TestContext.Current.CancellationToken);
        Assert.Equal(PersistentItemStatus.DependencyFailed, bStatus);
    }

    [Fact]
    public async Task TransitiveDependentMarkedAsDependencyFailed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: failed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );

        // B: enqueued, depends on A
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        // C: enqueued, depends on B
        var requestC = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowB.DatabaseId]
        );
        var workflowC = await repo.AddWorkflow(requestC, TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(2, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        Assert.Equal(
            PersistentItemStatus.DependencyFailed,
            await verifyRepo.GetWorkflowStatus(workflowB.DatabaseId, TestContext.Current.CancellationToken)
        );
        Assert.Equal(
            PersistentItemStatus.DependencyFailed,
            await verifyRepo.GetWorkflowStatus(workflowC.DatabaseId, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task CanceledWorkflow_CascadesToDependents()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: canceled
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Canceled,
            finalType: WorkflowType.Generic
        );

        // B: enqueued, depends on A
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(1, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        Assert.Equal(
            PersistentItemStatus.DependencyFailed,
            await verifyRepo.GetWorkflowStatus(workflowB.DatabaseId, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task CompletedWorkflow_NoCascade()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: completed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        );

        // B: enqueued, depends on A
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(0, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        Assert.Equal(
            PersistentItemStatus.Enqueued,
            await verifyRepo.GetWorkflowStatus(workflowB.DatabaseId, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task TerminalDependents_NotAffected()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: failed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );

        // B: already completed, depends on A
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        // Mark B as Completed
        workflowB.Status = PersistentItemStatus.Completed;
        await repo.UpdateWorkflow(workflowB, cancellationToken: TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(0, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        Assert.Equal(
            PersistentItemStatus.Completed,
            await verifyRepo.GetWorkflowStatus(workflowB.DatabaseId, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task MultipleFailed_IndependentChains()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Chain 1: A1 (failed) -> B1 (enqueued)
        var workflowA1 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );
        var requestB1 = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA1.DatabaseId]
        );
        var workflowB1 = await repo.AddWorkflow(requestB1, TestContext.Current.CancellationToken);

        // Chain 2: A2 (canceled) -> B2 (enqueued)
        var workflowA2 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Canceled,
            finalType: WorkflowType.Generic
        );
        var requestB2 = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA2.DatabaseId]
        );
        var workflowB2 = await repo.AddWorkflow(requestB2, TestContext.Current.CancellationToken);

        var affected = await RunCascade();

        Assert.Equal(2, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        Assert.Equal(
            PersistentItemStatus.DependencyFailed,
            await verifyRepo.GetWorkflowStatus(workflowB1.DatabaseId, TestContext.Current.CancellationToken)
        );
        Assert.Equal(
            PersistentItemStatus.DependencyFailed,
            await verifyRepo.GetWorkflowStatus(workflowB2.DatabaseId, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task AlreadyDependencyFailed_NotReprocessed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: failed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );

        // B: enqueued, depends on A
        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        // First cascade
        var affected1 = await RunCascade();
        Assert.Equal(1, affected1);

        // Second cascade — nothing more to process
        var affected2 = await RunCascade();
        Assert.Equal(0, affected2);
    }

    [Fact]
    public async Task ReturnsCorrectAffectedCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: failed
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );

        // B, C, D: all depend on A
        var dependents = new List<Workflow>();
        for (int i = 0; i < 3; i++)
        {
            var req = WorkflowTestHelper.CreateRequest(
                type: WorkflowType.Generic,
                dependencies: [workflowA.DatabaseId]
            );
            dependents.Add(await repo.AddWorkflow(req, TestContext.Current.CancellationToken));
        }

        var affected = await RunCascade();

        Assert.Equal(3, affected);

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        foreach (var dependent in dependents)
        {
            Assert.Equal(
                PersistentItemStatus.DependencyFailed,
                await verifyRepo.GetWorkflowStatus(dependent.DatabaseId, TestContext.Current.CancellationToken)
            );
        }
    }
}
