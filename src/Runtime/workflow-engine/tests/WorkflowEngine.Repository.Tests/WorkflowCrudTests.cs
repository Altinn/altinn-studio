using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

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
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);

        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);
        Assert.Equal(request.OperationId, workflow.OperationId);
        Assert.Equal(WorkflowType.Generic, workflow.Type);
        Assert.Equal(metadata.InstanceInformation.InstanceGuid, workflow.InstanceInformation.InstanceGuid);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(workflow.DatabaseId, dbWorkflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Equal(request.OperationId, dbWorkflow.OperationId);
        Assert.Equal(WorkflowType.Generic, dbWorkflow.Type);
        Assert.Equal(metadata.InstanceInformation.Org, dbWorkflow.InstanceInformation.Org);
        Assert.Equal(metadata.InstanceInformation.App, dbWorkflow.InstanceInformation.App);
        Assert.Equal(
            metadata.InstanceInformation.InstanceOwnerPartyId,
            dbWorkflow.InstanceInformation.InstanceOwnerPartyId
        );
        Assert.Equal(metadata.InstanceInformation.InstanceGuid, dbWorkflow.InstanceInformation.InstanceGuid);
        Assert.Equal(metadata.Actor.UserIdOrOrgNumber, dbWorkflow.Actor.UserIdOrOrgNumber);
        Assert.Equal("next", dbWorkflow.OperationId);
    }

    [Fact]
    public async Task AddWorkflow_WithSteps_PersistsSteps()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();
        var request = new WorkflowRequest
        {
            OperationId = "next",
            IdempotencyKey = $"test-key-{Guid.NewGuid()}",
            Type = WorkflowType.Generic,
            Steps =
            [
                new StepRequest { Command = new Command.AppCommand("step-one") },
                new StepRequest { Command = new Command.AppCommand("step-two") },
                new StepRequest { Command = new Command.AppCommand("step-three") },
            ],
        };
        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 50001234,
                InstanceGuid = instanceGuid,
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );

        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.Equal(3, workflow.Steps.Count);
        for (int i = 0; i < workflow.Steps.Count; i++)
            Assert.Equal(i, workflow.Steps[i].ProcessingOrder);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(3, dbWorkflow.Steps.Count);
        Assert.Equal(request.OperationId, dbWorkflow.OperationId);

        for (int i = 0; i < dbWorkflow.Steps.Count; i++)
        {
            var dbStep = dbWorkflow.Steps[i];
            var repoStep = workflow.Steps[i];

            Assert.Equal(repoStep.DatabaseId, dbStep.DatabaseId);
            Assert.Equal(i, dbStep.ProcessingOrder);
            Assert.Equal(PersistentItemStatus.Enqueued, dbStep.Status);
            Assert.Equal(repoStep.OperationId, dbStep.OperationId);
        }

        foreach (var step in workflow.Steps)
        {
            var dbStep = await fixture.GetStep(step.DatabaseId);
            Assert.NotNull(dbStep);
            Assert.Equal(step.DatabaseId, dbStep.DatabaseId);
            Assert.Equal(step.ProcessingOrder, dbStep.ProcessingOrder);
            Assert.Equal(PersistentItemStatus.Enqueued, dbStep.Status);
            Assert.Equal(step.OperationId, dbStep.OperationId);
            Assert.Equal(step.Actor.UserIdOrOrgNumber, dbStep.Actor.UserIdOrOrgNumber);
        }
    }

    [Fact]
    public async Task AddWorkflow_WithDependencies_PersistsDependencies()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, metadataB, TestContext.Current.CancellationToken);

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
        Assert.Equal(requestA.OperationId, dbWorkflowA.OperationId);
    }

    [Fact]
    public async Task AddWorkflow_InvalidDependency_Throws()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic, dependencies: [999999L]);

        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task AddWorkflow_WithLinks_PersistsLinks()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            links: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, metadataB, TestContext.Current.CancellationToken);

        Assert.NotNull(workflowB.Links);
        Assert.Single(workflowB.Links);
        Assert.Equal(workflowA.DatabaseId, workflowB.Links.First().DatabaseId);

        var dbWorkflowB = await fixture.GetWorkflow(workflowB.DatabaseId);
        Assert.NotNull(dbWorkflowB);
        Assert.NotNull(dbWorkflowB.Links);
        Assert.Single(dbWorkflowB.Links);
        Assert.Equal(workflowA.DatabaseId, dbWorkflowB.Links.First().DatabaseId);
    }

    [Fact]
    public async Task AddWorkflow_WithCrossInstanceLink_Throws()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        // B is on a different instance and tries to link to A
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            links: [workflowA.DatabaseId]
        );

        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo2.AddWorkflow(requestB, metadataB, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task AddWorkflowBatch_WithInBatchRefLink_PersistsLinks()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        var instanceGuid = Guid.NewGuid();
        var (_, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: instanceGuid, type: WorkflowType.Generic);

        // A and B in the same batch; B links to A using a within-batch ref string
        var requests = new List<WorkflowRequest>
        {
            new()
            {
                Ref = "wf-a",
                OperationId = "op-a",
                IdempotencyKey = $"key-a-{Guid.NewGuid()}",
                Type = WorkflowType.Generic,
                Steps = [new StepRequest { Command = new Command.AppCommand("step-a") }],
            },
            new()
            {
                Ref = "wf-b",
                OperationId = "op-b",
                IdempotencyKey = $"key-b-{Guid.NewGuid()}",
                Type = WorkflowType.Generic,
                Steps = [new StepRequest { Command = new Command.AppCommand("step-b") }],
                Links = [(WorkflowRef)"wf-a"],
            },
        };

        var results = await repo.AddWorkflowBatch(requests, metadata, TestContext.Current.CancellationToken);

        Assert.Equal(2, results.Count);
        var wfA = results.Single(w => w.OperationId == "op-a");
        var wfB = results.Single(w => w.OperationId == "op-b");

        var dbWfB = await fixture.GetWorkflow(wfB.DatabaseId);
        Assert.NotNull(dbWfB);
        Assert.NotNull(dbWfB.Links);
        Assert.Single(dbWfB.Links);
        Assert.Equal(wfA.DatabaseId, dbWfB.Links.First().DatabaseId);
    }

    [Fact]
    public async Task AddWorkflowBatch_WithCrossInstanceDependency_Throws()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A inserted on one instance
        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        // Batch on a different instance tries to depend on A via external ID
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (_, metadataB) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var batchRequest = new WorkflowRequest
        {
            OperationId = "op-b",
            IdempotencyKey = $"key-b-{Guid.NewGuid()}",
            Type = WorkflowType.Generic,
            Steps = [new StepRequest { Command = new Command.AppCommand("step-b") }],
            DependsOn = [(WorkflowRef)workflowA.DatabaseId],
        };

        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo2.AddWorkflowBatch([batchRequest], metadataB, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task AddWorkflowBatch_WithCrossInstanceLink_Throws()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A inserted on one instance
        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        // Batch on a different instance tries to link to A via external ID
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (_, metadataB) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var batchRequest = new WorkflowRequest
        {
            OperationId = "op-b",
            IdempotencyKey = $"key-b-{Guid.NewGuid()}",
            Type = WorkflowType.Generic,
            Steps = [new StepRequest { Command = new Command.AppCommand("step-b") }],
            Links = [(WorkflowRef)workflowA.DatabaseId],
        };

        await Assert.ThrowsAsync<EngineDbException>(() =>
            repo2.AddWorkflowBatch([batchRequest], metadataB, TestContext.Current.CancellationToken)
        );
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
    public async Task GetFailedWorkflows_ReturnsFailed()
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
        var canceled = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Canceled,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var failedStatuses = new List<PersistentItemStatus>
        {
            PersistentItemStatus.Failed,
            PersistentItemStatus.Canceled,
            PersistentItemStatus.DependencyFailed,
        };
        var results = await queryRepo.GetFinishedWorkflows(
            failedStatuses,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(3, results.Count);
        Assert.Contains(results, w => w.DatabaseId == canceled.DatabaseId);
        Assert.Contains(results, w => w.DatabaseId == failed.DatabaseId);
        Assert.Contains(results, w => w.DatabaseId == dependencyFailed.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == completed.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == requeued.DatabaseId);
    }

    [Fact]
    public async Task UpdateWorkflow_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

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
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

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

    [Fact]
    public async Task UpdateStep_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);
        var step = workflow.Steps[0];

        step.Status = PersistentItemStatus.Processing;
        step.RequeueCount = 3;
        step.BackoffUntil = DateTimeOffset.UtcNow.AddMinutes(5);
        await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);

        var dbStep = await fixture.GetStep(step.DatabaseId);
        Assert.NotNull(dbStep);
        Assert.Equal(PersistentItemStatus.Processing, dbStep.Status);
        Assert.Equal(3, dbStep.RequeueCount);
        Assert.NotNull(dbStep.BackoffUntil);
        Assert.NotNull(dbStep.UpdatedAt);
    }

    [Fact]
    public async Task BatchUpdateWorkflowAndSteps_UpdatesWorkflowAndSteps()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var request = new WorkflowRequest
        {
            OperationId = "next",
            IdempotencyKey = $"test-key-{Guid.NewGuid()}",
            Type = WorkflowType.Generic,
            Steps =
            [
                new StepRequest { Command = new Command.AppCommand("step-one") },
                new StepRequest { Command = new Command.AppCommand("step-two") },
            ],
        };
        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 50001234,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);
        var step0 = workflow.Steps[0];
        var step1 = workflow.Steps[1];

        workflow.Status = PersistentItemStatus.Completed;
        step0.Status = PersistentItemStatus.Completed;
        step1.Status = PersistentItemStatus.Failed;
        step1.RequeueCount = 2;
        await repo.BatchUpdateWorkflowAndSteps(
            workflow,
            [step0, step1],
            cancellationToken: TestContext.Current.CancellationToken
        );

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Completed, dbWorkflow.Status);
        Assert.NotNull(dbWorkflow.UpdatedAt);

        var dbStep0 = await fixture.GetStep(step0.DatabaseId);
        Assert.NotNull(dbStep0);
        Assert.Equal(PersistentItemStatus.Completed, dbStep0.Status);
        Assert.NotNull(dbStep0.UpdatedAt);

        var dbStep1 = await fixture.GetStep(step1.DatabaseId);
        Assert.NotNull(dbStep1);
        Assert.Equal(PersistentItemStatus.Failed, dbStep1.Status);
        Assert.Equal(2, dbStep1.RequeueCount);
        Assert.NotNull(dbStep1.UpdatedAt);
    }

    [Fact]
    public async Task AddWorkflow_WithFutureStartAt_PersistsStartAt()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var startAt = DateTimeOffset.UtcNow.AddHours(1);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic, startAt: startAt);

        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        Assert.NotNull(workflow.StartAt);
        Assert.Equal(startAt.ToUnixTimeSeconds(), workflow.StartAt.Value.ToUnixTimeSeconds());

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.NotNull(dbWorkflow.StartAt);
        Assert.Equal(startAt.ToUnixTimeSeconds(), dbWorkflow.StartAt.Value.ToUnixTimeSeconds());
    }

    [Fact]
    public async Task GetActiveWorkflows_IncludesRequeuedStep()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);
        var step = workflow.Steps[0];
        step.Status = PersistentItemStatus.Requeued;
        await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var active = await queryRepo.GetActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.Single(active);
        Assert.Equal(workflow.DatabaseId, active[0].DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsFutureDated()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (futureRequest, futureMetadata) = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            startAt: DateTimeOffset.UtcNow.AddHours(1)
        );
        var futureWorkflow = await repo.AddWorkflow(
            futureRequest,
            futureMetadata,
            TestContext.Current.CancellationToken
        );
        var (immediateRequest, immediateMetadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var immediateWorkflow = await repo.AddWorkflow(
            immediateRequest,
            immediateMetadata,
            TestContext.Current.CancellationToken
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Single(scheduled);
        Assert.Equal(futureWorkflow.DatabaseId, scheduled[0].DatabaseId);
        Assert.DoesNotContain(scheduled, w => w.DatabaseId == immediateWorkflow.DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsWorkflowBlockedByDependency()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: Enqueued (non-terminal) — its dependents should appear as scheduled
        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflowA = await repo.AddWorkflow(requestA, metadataA, TestContext.Current.CancellationToken);

        // B: depends on A (blocked by non-terminal dependency)
        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo.AddWorkflow(requestB, metadataB, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Contains(scheduled, w => w.DatabaseId == workflowB.DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ExcludesTerminalDependency()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // A: Completed (terminal) — dependents should NOT be blocked
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        );

        // B: depends on A (dependency is terminal, no future StartAt)
        await using var context2 = fixture.CreateDbContext();
        var repo2 = fixture.CreateRepository(context2);
        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await repo2.AddWorkflow(requestB, metadataB, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);
        var active = await queryRepo.GetActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.DoesNotContain(scheduled, w => w.DatabaseId == workflowB.DatabaseId);
        Assert.Contains(active, w => w.DatabaseId == workflowB.DatabaseId);
    }

    [Fact]
    public async Task CountActiveWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            finalType: WorkflowType.Generic
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            finalType: WorkflowType.Generic
        );
        var terminal = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        );
        foreach (var step in terminal.Steps)
        {
            step.Status = PersistentItemStatus.Completed;
            await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);
        }

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var count = await queryRepo.CountActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task CountFailedWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            finalType: WorkflowType.Generic
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            finalType: WorkflowType.Generic
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            finalType: WorkflowType.Generic
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        );
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            finalType: WorkflowType.Generic
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var count = await queryRepo.CountFailedWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task CountScheduledWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Can start immediately (no scheduling, no dependencies)
        var (parentRequest, parentMetadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var parent = await repo.AddWorkflow(parentRequest, parentMetadata, TestContext.Current.CancellationToken);

        // Have to wait for either dependencies, start time, or both
        var (futureReq, futureMeta) = WorkflowTestHelper.CreateRequest(
            type: WorkflowType.Generic,
            startAt: DateTimeOffset.UtcNow.AddHours(1)
        );
        await repo.AddWorkflow(futureReq, futureMeta, TestContext.Current.CancellationToken);

        var (depReq, depMeta) = WorkflowTestHelper.CreateRequest(
            instanceGuid: parent.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            dependencies: [parent.DatabaseId]
        );
        await repo.AddWorkflow(depReq, depMeta, TestContext.Current.CancellationToken);

        var (bothReq, bothMeta) = WorkflowTestHelper.CreateRequest(
            instanceGuid: parent.InstanceInformation.InstanceGuid,
            type: WorkflowType.Generic,
            startAt: DateTimeOffset.UtcNow.AddHours(2),
            dependencies: [parent.DatabaseId]
        );
        await repo.AddWorkflow(bothReq, bothMeta, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var count = await queryRepo.CountScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(3, count);
    }

    [Fact]
    public async Task GetSuccessfulWorkflows_ReturnsOnlyCompleted()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();

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
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );
        var depFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var results = await queryRepo.GetFinishedWorkflows(
            PersistentItemStatusMap.Successful.ToList(),
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Single(results);
        Assert.Equal(completed.DatabaseId, results[0].DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == failed.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == enqueued.DatabaseId);
        Assert.DoesNotContain(results, w => w.DatabaseId == depFailed.DatabaseId);
    }

    [Fact]
    public async Task ToDomainModel_Step_ConvertsCorrectly()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();
        var retryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(2),
            maxRetries: 5,
            maxDelay: TimeSpan.FromMinutes(1)
        );
        var request = new WorkflowRequest
        {
            OperationId = "op-domain-model",
            IdempotencyKey = $"test-key-{Guid.NewGuid()}",
            Type = WorkflowType.Generic,
            Metadata = """{"customField":"value"}""",
            Steps =
            [
                new StepRequest
                {
                    Command = new Command.AppCommand("step-one", "payload-1"),
                    RetryStrategy = retryStrategy,
                    Metadata = """{"stepMeta":"one"}""",
                },
                new StepRequest
                {
                    Command = new Command.Webhook("http://example.com/hook", "body", "application/json"),
                },
                new StepRequest { Command = new Command.AppCommand("step-three") },
            ],
        };
        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 50001234,
                InstanceGuid = instanceGuid,
            },
            Actor: new Actor { UserIdOrOrgNumber = "12345" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );

        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        // Fetch from DB via a fresh context to ensure full round-trip through EF
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(3, dbWorkflow.Steps.Count);

        // Step 0: AppCommand with retry strategy
        var step0 = dbWorkflow.Steps[0];
        Assert.Equal(0, step0.ProcessingOrder);
        Assert.IsType<Command.AppCommand>(step0.Command);
        var appCmd = (Command.AppCommand)step0.Command;
        Assert.Equal("step-one", appCmd.CommandKey);
        Assert.Equal("payload-1", appCmd.Payload);
        Assert.NotNull(step0.RetryStrategy);
        Assert.Equal(BackoffType.Exponential, step0.RetryStrategy.BackoffType);
        Assert.Equal(5, step0.RetryStrategy.MaxRetries);
        Assert.Equal(PersistentItemStatus.Enqueued, step0.Status);
        Assert.NotNull(step0.IdempotencyKey);
        Assert.Equal("12345", step0.Actor.UserIdOrOrgNumber);

        // Step 1: Webhook
        var step1 = dbWorkflow.Steps[1];
        Assert.Equal(1, step1.ProcessingOrder);
        Assert.IsType<Command.Webhook>(step1.Command);
        var webhook = (Command.Webhook)step1.Command;
        Assert.Equal("http://example.com/hook", webhook.Uri);
        Assert.Equal("body", webhook.Payload);
        Assert.Equal("application/json", webhook.ContentType);
        Assert.Null(step1.RetryStrategy);

        // Step 2: Another AppCommand (no retry strategy, no payload)
        var step2 = dbWorkflow.Steps[2];
        Assert.Equal(2, step2.ProcessingOrder);
        Assert.IsType<Command.AppCommand>(step2.Command);
        var appCmd2 = (Command.AppCommand)step2.Command;
        Assert.Equal("step-three", appCmd2.CommandKey);
        Assert.Null(appCmd2.Payload);
        Assert.Null(step2.RetryStrategy);
    }

    [Fact]
    public async Task GetDistinctOrgsAndApps_ReturnsUniqueOrgAppPairs()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // Insert workflows across multiple (org, app) combinations, including duplicates
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        ); // ttd / test-app (default)
        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic
        ); // ttd / test-app (duplicate)

        var (req2, meta2) = WorkflowTestHelper.CreateRequest(
            org: "digdir",
            app: "beta-app",
            type: WorkflowType.Generic
        );
        await repo.AddWorkflow(req2, meta2, TestContext.Current.CancellationToken);

        var (req3, meta3) = WorkflowTestHelper.CreateRequest(org: "ttd", app: "other-app", type: WorkflowType.Generic);
        await repo.AddWorkflow(req3, meta3, TestContext.Current.CancellationToken);

        var (req4, meta4) = WorkflowTestHelper.CreateRequest(
            org: "digdir",
            app: "beta-app",
            type: WorkflowType.Generic
        );
        await repo.AddWorkflow(req4, meta4, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var pairs = await queryRepo.GetDistinctOrgsAndApps(TestContext.Current.CancellationToken);

        Assert.Equal(3, pairs.Count);
        // Ordered by org then app
        Assert.Equal(("digdir", "beta-app"), pairs[0]);
        Assert.Equal(("ttd", "other-app"), pairs[1]);
        Assert.Equal(("ttd", "test-app"), pairs[2]);
    }

    [Fact]
    public async Task GetWorkflow_ByIdempotencyKey_ReturnsMatch()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var found = await queryRepo.GetWorkflow(
            workflow.IdempotencyKey,
            workflow.CreatedAt,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(found);
        Assert.Equal(workflow.DatabaseId, found.DatabaseId);
        Assert.Equal(workflow.IdempotencyKey, found.IdempotencyKey);
        Assert.Equal(workflow.OperationId, found.OperationId);
        Assert.NotEmpty(found.Steps);
    }

    [Fact]
    public async Task GetWorkflow_ByIdempotencyKey_NoMatch_ReturnsNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(type: WorkflowType.Generic);
        var workflow = await repo.AddWorkflow(request, metadata, TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        // Wrong key
        var wrongKey = await queryRepo.GetWorkflow(
            "nonexistent-key",
            workflow.CreatedAt,
            TestContext.Current.CancellationToken
        );
        Assert.Null(wrongKey);

        // Wrong createdAt
        var wrongDate = await queryRepo.GetWorkflow(
            workflow.IdempotencyKey,
            workflow.CreatedAt.AddDays(-1),
            TestContext.Current.CancellationToken
        );
        Assert.Null(wrongDate);
    }

    [Fact]
    public async Task GetFinishedWorkflowsWithCount_ReturnsWorkflowsAndTotalCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);
        var instanceGuid = Guid.NewGuid();

        // Insert 4 completed workflows and 1 failed
        for (int i = 0; i < 4; i++)
        {
            await WorkflowTestHelper.InsertAndSetStatus(
                repo,
                context,
                PersistentItemStatus.Completed,
                instanceGuid: instanceGuid,
                finalType: WorkflowType.Generic
            );
        }

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid,
            finalType: WorkflowType.Generic
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        // Page of 2 from completed workflows
        var statuses = PersistentItemStatusMap.Successful.ToList();
        var (workflows, totalCount) = await queryRepo.GetFinishedWorkflowsWithCount(
            statuses,
            take: 2,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(4, totalCount);
        Assert.Equal(2, workflows.Count);
        Assert.All(workflows, w => Assert.Equal(PersistentItemStatus.Completed, w.Status));
    }

    [Fact]
    public async Task GetFinishedWorkflowsWithCount_FiltersCorrectly()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository(context);

        // InsertAndSetStatus sets DB status via raw SQL. We also call UpdateWorkflow to set UpdatedAt.
        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic,
            org: "org-a",
            app: "app-a"
        );
        wf1.Status = PersistentItemStatus.Completed;
        await repo.UpdateWorkflow(wf1, cancellationToken: TestContext.Current.CancellationToken);

        var wf2 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            finalType: WorkflowType.Generic,
            org: "org-b",
            app: "app-b"
        );
        wf2.Status = PersistentItemStatus.Completed;
        await repo.UpdateWorkflow(wf2, cancellationToken: TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository(queryContext);

        var statuses = PersistentItemStatusMap.Successful.ToList();

        // Filter by org
        var (byOrg, orgCount) = await queryRepo.GetFinishedWorkflowsWithCount(
            statuses,
            org: "org-a",
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, orgCount);
        Assert.Single(byOrg);
        Assert.Equal(wf1.DatabaseId, byOrg[0].DatabaseId);

        // Search
        var (bySearch, searchCount) = await queryRepo.GetFinishedWorkflowsWithCount(
            statuses,
            search: "org-b",
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, searchCount);
        Assert.Single(bySearch);
    }
}
