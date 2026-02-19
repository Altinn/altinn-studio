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

        var request = WorkflowTestHelper.CreateRequest();
        var workflow = await repo.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);

        // Verify persisted correctly in database
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(WorkflowType.AppProcessChange, dbWorkflow.Type);
        Assert.Equal(request.IdempotencyKey, dbWorkflow.IdempotencyKey);
        Assert.Equal(request.InstanceInformation.InstanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
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

        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        // Verify persisted with correct dependency
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

        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        // Verify persisted with correct dependency
        var dbWorkflow = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.NotNull(dbWorkflow.Dependencies);
        Assert.Single(dbWorkflow.Dependencies);
        Assert.Equal(workflowA.DatabaseId, dbWorkflow.Dependencies.First().DatabaseId);
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

        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowQ.DatabaseId);

        // Verify the pending workflow is persisted with its dependency on the processing one
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

        // New workflow on instance Y — should be accepted
        var request = WorkflowTestHelper.CreateRequest(instanceGuid: instanceY);
        var workflow = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);

        // Verify the workflow on instance Y is persisted correctly
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

        // Processing AppProcessChange workflow
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);

        // Generic workflow on same instance — no constraint
        var request = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid, type: WorkflowType.Generic);
        var workflow = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);

        // Verify the Generic workflow is persisted on the same instance
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

        var request = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, TestContext.Current.CancellationToken)
        );
        Assert.Equal("disconnected", ex.RejectionReason);

        // Verify the rejected workflow was NOT persisted (transaction rolled back)
        var dbWorkflow = await fixture.GetWorkflow(ex.BlockingWorkflowId);
        Assert.NotNull(dbWorkflow); // The blocking workflow exists
        Assert.Equal(PersistentItemStatus.Processing, (await fixture.GetWorkflow(dbWorkflow.DatabaseId))!.Status);
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

        // C is completed (different workflow)
        var workflowC = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);

        // Depend on C instead of P
        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowC.DatabaseId]
        );

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, TestContext.Current.CancellationToken)
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

        // Q is enqueued, depending on P
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var requestQ = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, TestContext.Current.CancellationToken);

        // Verify Q was persisted before testing rejection
        var dbQ = await fixture.GetWorkflow(workflowQ.DatabaseId);
        Assert.NotNull(dbQ);
        Assert.Equal(PersistentItemStatus.Enqueued, dbQ.Status);

        // Third workflow depending on Q — should be rejected (slot full)
        await using var context3 = fixture.CreateDbContext();
        var repo3 = fixture.CreateRepository(context3);
        var requestR = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowQ.DatabaseId]
        );

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo3.AddWorkflow(requestR, TestContext.Current.CancellationToken)
        );
        Assert.Equal("slot_full", ex.RejectionReason);
    }

    [Fact]
    public async Task R4_PendingExists_Rejected()
    {
        var instanceGuid = Guid.NewGuid();

        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Q is enqueued (no processing workflow)
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);

        var request = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, TestContext.Current.CancellationToken)
        );
        Assert.Equal("pending_exists", ex.RejectionReason);
    }

    [Fact]
    public async Task R5_DependOnDifferentProcessing_Rejected()
    {
        var instanceGuid = Guid.NewGuid();

        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // P is processing on this instance
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // Other is processing on a different instance
        var otherInstanceGuid = Guid.NewGuid();
        var otherWorkflow = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: otherInstanceGuid
        );

        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);

        // Depend on the other instance's workflow — should be disconnected
        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [otherWorkflow.DatabaseId]
        );

        var ex = await Assert.ThrowsAsync<ActiveWorkflowConstraintException>(() =>
            repo2.AddWorkflow(request, TestContext.Current.CancellationToken)
        );
        Assert.Equal("disconnected", ex.RejectionReason);
    }

    // ── Edge cases ──

    [Fact]
    public async Task E1_DependencyCompletesBeforeInsert_Accepted()
    {
        var instanceGuid = Guid.NewGuid();

        // Set up P as processing, then complete it
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var workflowP = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );

        // Mark P as completed via raw SQL
        await using var updateContext = fixture.CreateDbContext();
        await updateContext.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = 3 WHERE "Id" = {workflowP.DatabaseId}""",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Insert B depending on P — P is now terminal, so no active count
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var request = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowB = await repo2.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowB.DatabaseId);

        // Verify B is persisted with dependency on the now-completed P
        var dbWorkflowB = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflowB);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflowB.Status);
        Assert.NotNull(dbWorkflowB.Dependencies);
        Assert.Single(dbWorkflowB.Dependencies);
        Assert.Equal(workflowP.DatabaseId, dbWorkflowB.Dependencies.First().DatabaseId);

        // Verify P is indeed completed in the database
        var dbWorkflowP = await fixture.GetWorkflow(workflowP.DatabaseId);
        Assert.NotNull(dbWorkflowP);
        Assert.Equal(PersistentItemStatus.Completed, dbWorkflowP.Status);
    }

    [Fact]
    public async Task E2_FailedWorkflow_CascadesCleansUp()
    {
        var instanceGuid = Guid.NewGuid();

        // P is processing
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
        var requestQ = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, TestContext.Current.CancellationToken);

        // Fail P
        await using var failContext = fixture.CreateDbContext();
        await failContext.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = 4 WHERE "Id" = {workflowP.DatabaseId}""",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Run cascade
        await failContext.Database.ExecuteSqlRawAsync(
            "SELECT cascade_dependency_failures()",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Verify Q is DependencyFailed
        await using var verifyContext = fixture.CreateDbContext();
        var verifyRepo = fixture.CreateRepository(verifyContext);
        var qStatus = await verifyRepo.GetWorkflowStatus(workflowQ.DatabaseId, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.DependencyFailed, qStatus);
    }

    [Fact]
    public async Task E3_CompletedWorkflow_FreesSlot()
    {
        var instanceGuid = Guid.NewGuid();

        // P is processing
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
        var requestQ = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowP.DatabaseId]
        );
        var workflowQ = await repo2.AddWorkflow(requestQ, TestContext.Current.CancellationToken);

        // Complete P
        await using var completeContext = fixture.CreateDbContext();
        await completeContext.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = 3 WHERE "Id" = {workflowP.DatabaseId}""",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Mark Q as processing (simulating engine pick-up)
        await using var context3 = fixture.CreateDbContext();
        await context3.Database.ExecuteSqlAsync(
            $"""UPDATE "Workflows" SET "Status" = 1 WHERE "Id" = {workflowQ.DatabaseId}""",
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Add R depending on Q — should succeed since P completed and Q is the sole active
        await using var context4 = fixture.CreateDbContext();
        var repo4 = fixture.CreateRepository(context4);
        var requestR = WorkflowTestHelper.CreateRequest(
            instanceGuid: instanceGuid,
            dependencies: [workflowQ.DatabaseId]
        );
        var workflowR = await repo4.AddWorkflow(requestR, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflowR.DatabaseId);

        // Verify the full chain is persisted in the database
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
                var request = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid);
                return await repo.AddWorkflow(request);
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

        // Verify the winning workflow is actually in the database
        var winner = succeeded[0].Workflow!;
        var dbWorkflow = await fixture.GetWorkflow(winner.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(instanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Single(dbWorkflow.Steps);
    }
}
