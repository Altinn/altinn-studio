using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Integration.Tests.Helpers;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Integration.Tests;

[Collection(PostgresCollection.Name)]
public sealed class ConcurrencyConstraintTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    // ── Allowed scenarios ──

    [Fact]
    public async Task A1_NoActiveWorkflows_Accepted()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest();

        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(WorkflowType.AppProcessChange, dbWorkflow.Type);
        Assert.Equal(metadata.InstanceInformation.InstanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Single(dbWorkflow.Steps);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Steps[0].Status);
    }

    [Fact]
    public async Task A2_DependOnCompletedWorkflow_Accepted()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowA.DatabaseId]
        );

        var workflowB = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        var dbWorkflow = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(WorkflowType.AppProcessChange, dbWorkflow.Type);
        Assert.NotNull(dbWorkflow.Dependencies);
        Assert.Single(dbWorkflow.Dependencies);
        Assert.Equal(workflowA.DatabaseId, dbWorkflow.Dependencies.First().DatabaseId);
        Assert.Single(dbWorkflow.Steps);
    }

    [Fact]
    public async Task A3_DependOnFailedWorkflow_Accepted()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowA.DatabaseId]
        );

        var workflowB = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        var dbWorkflow = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.NotNull(dbWorkflow.Dependencies);
        Assert.Single(dbWorkflow.Dependencies);
        Assert.Equal(workflowA.DatabaseId, dbWorkflow.Dependencies.First().DatabaseId);
        Assert.Single(dbWorkflow.Steps);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Steps[0].Status);
    }

    [Fact]
    public async Task A4_DependOnProcessingWorkflow_Accepted()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );

        var workflowQ = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowQ.DatabaseId);

        var dbWorkflow = await fixture.GetWorkflow(workflowQ.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(WorkflowType.AppProcessChange, dbWorkflow.Type);
        Assert.NotNull(dbWorkflow.Dependencies);
        Assert.Single(dbWorkflow.Dependencies);
        Assert.Equal(workflowP.DatabaseId, dbWorkflow.Dependencies.First().DatabaseId);
        Assert.Single(dbWorkflow.Steps);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Steps[0].Status);
    }

    [Fact]
    public async Task A5_DifferentInstances_Independent()
    {
        var instanceX = Guid.NewGuid();
        var instanceY = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Processing workflow on instance X
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceX
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceY);

        var workflow = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(instanceY, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Single(dbWorkflow.Steps);
    }

    [Fact]
    public async Task A6_DifferentType_NoInterference()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Processing AppProcessChange workflow on the same instance
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            type: WorkflowType.Generic
        );

        var workflow = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(WorkflowType.Generic, dbWorkflow.Type);
        Assert.Equal(instanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
    }

    // ── Rejected scenarios ──

    [Fact]
    public async Task R1_ProcessingExists_NoDependency_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );

        Assert.Equal("disconnected", ex.RejectionReason);

        // Blocking workflow exists and is still Processing
        var dbBlocking = await fixture.GetWorkflow(ex.BlockingWorkflowId);
        Assert.NotNull(dbBlocking);
        Assert.Equal(PersistentItemStatus.Processing, dbBlocking.Status);
    }

    [Fact]
    public async Task R2_ProcessingExists_DependOnWrongWorkflow_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // P is processing
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );
        // C is completed (a different workflow for the same instance)
        var workflowC = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowC.DatabaseId]
        );

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );

        Assert.Equal("disconnected", ex.RejectionReason);
    }

    [Fact]
    public async Task R3_SlotFull_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // P is processing
        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // Q is enqueued, depending on P (fills the pending slot)
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (requestQ, metadataQ) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, metadataQ, TestContext.Current.CancellationToken);

        // Verify Q was persisted — both slots are now occupied
        var dbQ = await fixture.GetWorkflow(workflowQ.DatabaseId);
        Assert.NotNull(dbQ);
        Assert.Equal(PersistentItemStatus.Enqueued, dbQ.Status);

        // Third workflow depending on Q — should be rejected (slot full)
        await using var context3 = fixture.CreateDbContext();
        var repo3 = fixture.CreateRepository(context3);
        var (requestR, metadataR) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowQ.DatabaseId]
        );

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo3.AddWorkflow(requestR, metadataR, TestContext.Current.CancellationToken)
        );

        Assert.Equal("slot_full", ex.RejectionReason);
    }

    [Fact]
    public async Task R4_PendingExists_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Q is enqueued with no processing workflow behind it
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );

        Assert.Equal("pending_exists", ex.RejectionReason);
    }

    [Fact]
    public async Task R4b_RequeuedWorkflow_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A Requeued workflow (non-terminal, no processing workflow behind it)
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );

        Assert.Equal("pending_exists", ex.RejectionReason);
    }

    [Fact]
    public async Task R5_DependOnDifferentInstance_Rejected()
    {
        var instanceGuid = Guid.NewGuid();
        var otherInstanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // P is processing on the target instance
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );
        // Other is processing on a different instance
        var otherWorkflow = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: otherInstanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [otherWorkflow.DatabaseId]
        );

        // Cross-instance dependency IDs are filtered out at lookup time, so the
        // dependency cannot be found — EngineDbException is thrown before the
        // concurrency constraint check is even reached.
        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );
    }

    // ── Edge cases ──

    [Fact]
    public async Task E1_DependencyCompletesBeforeInsert_Accepted()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // P completes before B is submitted
        workflowP.Status = PersistentItemStatus.Completed;
        await using var updateContext = fixture.CreateDbContext();
        var updateRepo = fixture.CreateRepository(updateContext);
        await updateRepo.UpdateWorkflow(workflowP, cancellationToken: TestContext.Current.CancellationToken);

        // B depends on the now-terminal P — active count is zero, so accepted
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );

        var workflowB = await repo2.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        var dbWorkflowP = await fixture.GetWorkflow(workflowP.DatabaseId);
        Assert.NotNull(dbWorkflowP);
        Assert.Equal(PersistentItemStatus.Completed, dbWorkflowP.Status);

        var dbWorkflowB = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflowB);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflowB.Status);
        Assert.NotNull(dbWorkflowB.Dependencies);
        Assert.Single(dbWorkflowB.Dependencies);
        Assert.Equal(workflowP.DatabaseId, dbWorkflowB.Dependencies.First().DatabaseId);
    }

    [Fact]
    public async Task E2_FailedWorkflow_CascadesCleansUp()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // Q enqueued, depending on P
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (requestQ, metadataQ) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, metadataQ, TestContext.Current.CancellationToken);

        // P fails; cascade marks Q as DependencyFailed
        workflowP.Status = PersistentItemStatus.Failed;
        await using var failContext = fixture.CreateDbContext();
        var failRepo = fixture.CreateRepository(failContext);
        await failRepo.UpdateWorkflow(workflowP, cancellationToken: TestContext.Current.CancellationToken);

        await failContext.Database.ExecuteSqlRawAsync(
            "SELECT cascade_dependency_failures()",
            cancellationToken: TestContext.Current.CancellationToken
        );

        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        var qStatus = await verifyRepo.GetWorkflowStatus(workflowQ.DatabaseId, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.DependencyFailed, qStatus);
    }

    [Fact]
    public async Task E3_CompletedWorkflow_FreesSlot()
    {
        var instanceGuid = Guid.NewGuid();
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // Q enqueued, depending on P
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (requestQ, metadataQ) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, metadataQ, TestContext.Current.CancellationToken);

        // P completes, freeing the processing slot
        workflowP.Status = PersistentItemStatus.Completed;
        await using var completeContext = fixture.CreateDbContext();
        var completeRepo = fixture.CreateRepository(completeContext);
        await completeRepo.UpdateWorkflow(workflowP, cancellationToken: TestContext.Current.CancellationToken);

        // Engine picks up Q
        workflowQ.Status = PersistentItemStatus.Processing;
        await using var context3 = fixture.CreateDbContext();
        var repo3 = fixture.CreateRepository(context3);
        await repo3.UpdateWorkflow(workflowQ, cancellationToken: TestContext.Current.CancellationToken);

        // R depends on Q — should succeed since P completed and Q is the sole active
        await using var context4 = fixture.CreateDbContext();
        var repo4 = fixture.CreateRepository(context4);
        var (requestR, metadataR) = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowQ.DatabaseId]
        );
        var workflowR = await repo4.AddWorkflow(requestR, metadataR, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowR.DatabaseId);

        var dbP = await fixture.GetWorkflow(workflowP.DatabaseId);
        Assert.NotNull(dbP);
        Assert.Equal(PersistentItemStatus.Completed, dbP.Status);

        var dbQ = await fixture.GetWorkflow(workflowQ.DatabaseId);
        Assert.NotNull(dbQ);
        Assert.Equal(PersistentItemStatus.Processing, dbQ.Status);

        var dbR = await fixture.GetWorkflow(workflowR.DatabaseId);
        Assert.NotNull(dbR);
        Assert.Equal(PersistentItemStatus.Enqueued, dbR.Status);
        Assert.NotNull(dbR.Dependencies);
        Assert.Single(dbR.Dependencies);
        Assert.Equal(workflowQ.DatabaseId, dbR.Dependencies.First().DatabaseId);
    }

    [Fact]
    public async Task E4_ConcurrentInserts_OnlyOneWins()
    {
        var instanceGuid = Guid.NewGuid();

        var tasks = Enumerable
            .Range(0, 2)
            .Select(async _ =>
            {
                await using var ctx = fixture.CreateDbContext();
                var repo = fixture.CreateRepository(ctx);
                var (request, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);
                return await repo.AddWorkflow(request, metadata);
            })
            .ToList();

        var results = await Task.WhenAll(
            tasks.Select(async t =>
            {
                try
                {
                    var workflow = await t;
                    return (Succeeded: true, Workflow: (Workflow?)workflow, Exception: (Exception?)null);
                }
                catch (ActiveWorkflowConstraintException ex)
                {
                    return (Succeeded: false, Workflow: (Workflow?)null, Exception: (Exception?)ex);
                }
            })
        );

        var succeeded = results.Where(r => r.Succeeded).ToList();
        var failed = results.Count(r => !r.Succeeded);

        Assert.Single(succeeded);
        Assert.Equal(1, failed);

        var winner = succeeded[0].Workflow!;
        var dbWorkflow = await fixture.GetWorkflow(winner.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(instanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Single(dbWorkflow.Steps);
    }
}
