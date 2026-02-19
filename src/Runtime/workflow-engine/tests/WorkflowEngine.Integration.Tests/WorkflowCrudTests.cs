using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Integration.Tests.Helpers;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Integration.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowCrudTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task AddWorkflow_Unconstrained_ReturnsWorkflow()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);

        var workflow = await repo.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);
        Assert.Equal(request.IdempotencyKey, workflow.IdempotencyKey);
        Assert.Equal(WorkflowType.Generic, workflow.Type);
        Assert.Equal(request.InstanceInformation.InstanceGuid, workflow.InstanceInformation.InstanceGuid);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(workflow.DatabaseId, dbWorkflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(request.IdempotencyKey, dbWorkflow.IdempotencyKey);
        Assert.Equal(WorkflowType.Generic, dbWorkflow.Type);
        Assert.Equal(request.InstanceInformation.Org, dbWorkflow.InstanceInformation.Org);
        Assert.Equal(request.InstanceInformation.App, dbWorkflow.InstanceInformation.App);
        Assert.Equal(
            request.InstanceInformation.InstanceOwnerPartyId,
            dbWorkflow.InstanceInformation.InstanceOwnerPartyId
        );
        Assert.Equal(request.InstanceInformation.InstanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Equal(request.Actor.UserIdOrOrgNumber, dbWorkflow.Actor.UserIdOrOrgNumber);
        Assert.Equal("next", dbWorkflow.OperationId);
    }

    [Fact]
    public async Task AddWorkflow_WithSteps_PersistsSteps()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = new WorkflowEnqueueRequest(
            IdempotencyKey: Guid.NewGuid().ToString(),
            OperationId: "next",
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 50001234,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            StartAt: null,
            Steps:
            [
                new StepRequest { Command = new Command.AppCommand("step-one") },
                new StepRequest { Command = new Command.AppCommand("step-two") },
                new StepRequest { Command = new Command.AppCommand("step-three") },
            ],
            Type: WorkflowType.Generic
        );

        var workflow = await repo.AddWorkflow(request, TestContext.Current.CancellationToken);

        Assert.Equal(3, workflow.Steps.Count);
        for (int i = 0; i < workflow.Steps.Count; i++)
            Assert.Equal(i, workflow.Steps[i].ProcessingOrder);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(3, dbWorkflow.Steps.Count);
        Assert.Equal(request.IdempotencyKey, dbWorkflow.IdempotencyKey);

        for (int i = 0; i < dbWorkflow.Steps.Count; i++)
        {
            var dbStep = dbWorkflow.Steps[i];
            var repoStep = workflow.Steps[i];

            Assert.Equal(repoStep.DatabaseId, dbStep.DatabaseId);
            Assert.Equal(i, dbStep.ProcessingOrder);
            Assert.Equal(PersistentItemStatus.Enqueued, dbStep.Status);
            Assert.Equal(repoStep.IdempotencyKey, dbStep.IdempotencyKey);
        }

        foreach (var step in workflow.Steps)
        {
            var dbStep = await fixture.GetStep(step.DatabaseId);
            Assert.NotNull(dbStep);
            Assert.Equal(step.DatabaseId, dbStep.DatabaseId);
            Assert.Equal(step.ProcessingOrder, dbStep.ProcessingOrder);
            Assert.Equal(PersistentItemStatus.Enqueued, dbStep.Status);
            Assert.Equal(step.IdempotencyKey, dbStep.IdempotencyKey);
            Assert.Equal(step.Actor.UserIdOrOrgNumber, dbStep.Actor.UserIdOrOrgNumber);
        }
    }

    [Fact]
    public async Task AddWorkflow_WithDependencies_PersistsDependencies()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var requestA = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, TestContext.Current.CancellationToken);

        var requestB = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, TestContext.Current.CancellationToken);

        Assert.NotNull(workflowB.Dependencies);
        Assert.Single(workflowB.Dependencies);
        Assert.Equal(workflowA.DatabaseId, workflowB.Dependencies.First().DatabaseId);

        var dbWorkflowB = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflowB);
        Assert.NotNull(dbWorkflowB.Dependencies);
        Assert.Single(dbWorkflowB.Dependencies);
        Assert.Equal(workflowA.DatabaseId, dbWorkflowB.Dependencies.First().DatabaseId);

        var dbWorkflowA = await fixture.GetWorkflow(workflowA.DatabaseId);
        Assert.NotNull(dbWorkflowA);
        Assert.Equal(requestA.IdempotencyKey, dbWorkflowA.IdempotencyKey);
    }

    [Fact]
    public async Task AddWorkflow_InvalidDependency_Throws()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic, dependencies: [999999L]);

        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo.AddWorkflow(request, TestContext.Current.CancellationToken)
        );

        // Verify the workflow was not persisted (transaction rolled back)
        var notPersisted = await fixture.GetWorkflowByIdempotencyKey(request.IdempotencyKey);
        Assert.Null(notPersisted);
    }

    [Fact]
    public async Task GetActiveWorkflows_ReturnsNonTerminal()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();

        // Insert one workflow in each relevant status
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var processing = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );

        // GetActiveWorkflows filters by step status, so terminal workflows must have terminal steps
        foreach (var step in completed.Steps)
        {
            step.Status = PersistentItemStatus.Completed;
            await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);
        }
        foreach (var step in failed.Steps)
        {
            step.Status = PersistentItemStatus.Failed;
            await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);
        }

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var active = await queryRepo.GetActiveWorkflows(TestContext.Current.CancellationToken);

        // Active = workflows with at least one incomplete step (Enqueued, Processing, Requeued)
        Assert.Equal(2, active.Count);
        Assert.Contains(active, w => w.DatabaseId == enqueued.DatabaseId);
        Assert.Contains(active, w => w.DatabaseId == processing.DatabaseId);
        Assert.DoesNotContain(active, w => w.DatabaseId == completed.DatabaseId);
        Assert.DoesNotContain(active, w => w.DatabaseId == failed.DatabaseId);
    }

    [Fact]
    public async Task GetFailedWorkflows_ReturnsFailedAndRequeued()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();

        var requeued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var dependencyFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var results = await queryRepo.GetFailedWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(3, results.Count);
        Assert.Contains(results, w => w.DatabaseId == requeued.DatabaseId);
        Assert.Contains(results, w => w.DatabaseId == failed.DatabaseId);
        Assert.Contains(results, w => w.DatabaseId == dependencyFailed.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == completed.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == enqueued.DatabaseId);
    }

    [Fact]
    public async Task UpdateWorkflow_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, TestContext.Current.CancellationToken);

        workflow.Status = PersistentItemStatus.Processing;
        await repo.UpdateWorkflow(workflow, cancellationToken: TestContext.Current.CancellationToken);

        var status = await repo.GetWorkflowStatus(workflow.DatabaseId, TestContext.Current.CancellationToken);
        Assert.Equal(PersistentItemStatus.Processing, status);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Processing, dbWorkflow.Status);
        Assert.NotNull(dbWorkflow.UpdatedAt);
    }

    [Fact]
    public async Task GetWorkflowStatus_ReturnsCorrectStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, TestContext.Current.CancellationToken);

        var status = await repo.GetWorkflowStatus(workflow.DatabaseId, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Enqueued, status);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
    }

    [Fact]
    public async Task GetWorkflowStatus_NonExistent_ReturnsNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var status = await repo.GetWorkflowStatus(999999L, TestContext.Current.CancellationToken);

        Assert.Null(status);
        Assert.Null(await fixture.GetWorkflow(999999L));
    }
}
