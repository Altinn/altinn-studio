using System.Diagnostics;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowCrudTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static string GetRandomTraceContext()
    {
        using var activity = new Activity("testing");
        activity.Start();

        return activity.Id ?? throw new Exception("This will never be null");
    }

    [Fact]
    public async Task EnqueueBatch_WithInBatchRefLink_PersistsLinks()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var (_, metadata) = WorkflowTestHelper.CreateRequest(instanceGuid: Guid.NewGuid());

        var requests = new List<WorkflowRequest>
        {
            new()
            {
                Ref = "wf-a",
                OperationId = "op-a",
                Steps = [new StepRequest { Command = new Command.AppCommand("step-a") }],
            },
            new()
            {
                Ref = "wf-b",
                OperationId = "op-b",
                Steps = [new StepRequest { Command = new Command.AppCommand("step-b") }],
                Links = [(WorkflowRef)"wf-a"],
            },
        };

        var results = await WorkflowTestHelper.EnqueueWorkflows(repo, metadata, requests);
        var result = Assert.Single(results);
        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        Assert.NotNull(result.WorkflowIds);
        Assert.Equal(2, result.WorkflowIds.Length);

        var dbWfA = await fixture.GetWorkflow(result.WorkflowIds[0]);
        var dbWfB = await fixture.GetWorkflow(result.WorkflowIds[1]);

        Assert.NotNull(dbWfA);
        Assert.NotNull(dbWfB);
        Assert.NotNull(dbWfB.Links);
        Assert.Single(dbWfB.Links);
        Assert.Equal(dbWfA.DatabaseId, dbWfB.Links.First().DatabaseId);
    }

    [Fact]
    public async Task EnqueueBatch_WithCrossInstanceLink_ReturnsInvalidReference()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest();
        var workflowA = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestA, metadataA);

        var (_, metadataB) = WorkflowTestHelper.CreateRequest();
        var requestB = new WorkflowRequest
        {
            OperationId = "op-b",
            Steps = [new StepRequest { Command = new Command.AppCommand("step-b") }],
            Links = [(WorkflowRef)workflowA.DatabaseId],
        };

        var results = await WorkflowTestHelper.EnqueueWorkflows(repo, metadataB, [requestB]);
        var result = Assert.Single(results);
        Assert.Equal(BatchEnqueueResultStatus.InvalidReference, result.Status);
        Assert.Null(result.WorkflowIds);
    }

    [Fact]
    public async Task GetActiveWorkflows_ReturnsNonTerminal()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var instanceGuid = Guid.NewGuid();

        // Insert one workflow in each relevant status
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid
        );
        var processing = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            instanceGuid: instanceGuid
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid
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
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var instanceGuid = Guid.NewGuid();

        var requeued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            instanceGuid: instanceGuid
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid
        );
        var dependencyFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            instanceGuid: instanceGuid
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );
        var canceled = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Canceled,
            instanceGuid: instanceGuid
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

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
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

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
        var repo = fixture.CreateRepository();

        var nonExistentId = Guid.NewGuid();
        var status = await repo.GetWorkflowStatus(nonExistentId, TestContext.Current.CancellationToken);

        Assert.Null(status);
        Assert.Null(await fixture.GetWorkflow(nonExistentId));
    }

    [Fact]
    public async Task UpdateStep_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);
        var step = workflow.Steps[0];

        step.Status = PersistentItemStatus.Processing;
        step.RequeueCount = 3;
        await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);

        var dbStep = await fixture.GetStep(step.DatabaseId);
        Assert.NotNull(dbStep);
        Assert.Equal(PersistentItemStatus.Processing, dbStep.Status);
        Assert.Equal(3, dbStep.RequeueCount);
        Assert.NotNull(dbStep.UpdatedAt);
    }

    [Fact]
    public async Task EnqueueWorkflow_WithFutureStartAt_PersistsStartAt()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var startAt = DateTimeOffset.UtcNow.AddHours(1);
        var (request, metadata) = WorkflowTestHelper.CreateRequest(startAt: startAt);

        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

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
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);
        var step = workflow.Steps[0];
        step.Status = PersistentItemStatus.Requeued;
        await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var active = await queryRepo.GetActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.Single(active);
        Assert.Equal(workflow.DatabaseId, active[0].DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsFutureDated()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (futureRequest, futureMetadata) = WorkflowTestHelper.CreateRequest(
            startAt: DateTimeOffset.UtcNow.AddHours(1)
        );
        var futureWorkflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, futureRequest, futureMetadata);
        var (immediateRequest, immediateMetadata) = WorkflowTestHelper.CreateRequest();
        var immediateWorkflow = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            immediateRequest,
            immediateMetadata
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Single(scheduled);
        Assert.Equal(futureWorkflow.DatabaseId, scheduled[0].DatabaseId);
        Assert.DoesNotContain(scheduled, w => w.DatabaseId == immediateWorkflow.DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsWorkflowBlockedByDependency()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // A: Enqueued (non-terminal) — its dependents should appear as scheduled
        var (requestA, metadataA) = WorkflowTestHelper.CreateRequest();
        var workflowA = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestA, metadataA);

        // B: depends on A (blocked by non-terminal dependency)
        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestB, metadataB);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Contains(scheduled, w => w.DatabaseId == workflowB.DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ExcludesTerminalDependency()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // A: Completed (terminal) — dependents should NOT be blocked
        var workflowA = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);

        // B: depends on A (dependency is terminal, no future StartAt)
        await using var context2 = fixture.CreateDbContext();
        var (requestB, metadataB) = WorkflowTestHelper.CreateRequest(
            instanceGuid: workflowA.InstanceInformation.InstanceGuid,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await WorkflowTestHelper.EnqueueWorkflow(repo, context2, requestB, metadataB);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);
        var active = await queryRepo.GetActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.DoesNotContain(scheduled, w => w.DatabaseId == workflowB.DatabaseId);
        Assert.Contains(active, w => w.DatabaseId == workflowB.DatabaseId);
    }

    [Fact]
    public async Task CountActiveWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var terminal = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        foreach (var step in terminal.Steps)
        {
            step.Status = PersistentItemStatus.Completed;
            await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);
        }

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var count = await queryRepo.CountActiveWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task CountFailedWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Requeued);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.DependencyFailed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed);
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var count = await queryRepo.CountFailedWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task CountScheduledWorkflows_ReturnsCorrectCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Can start immediately (no scheduling, no dependencies)
        var (parentRequest, parentMetadata) = WorkflowTestHelper.CreateRequest();
        var parent = await WorkflowTestHelper.EnqueueWorkflow(repo, context, parentRequest, parentMetadata);

        // Have to wait for either dependencies, start time, or both
        var (futureReq, futureMeta) = WorkflowTestHelper.CreateRequest(startAt: DateTimeOffset.UtcNow.AddHours(1));
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, futureReq, futureMeta);

        var (depReq, depMeta) = WorkflowTestHelper.CreateRequest(
            instanceGuid: parent.InstanceInformation.InstanceGuid,
            dependencies: [parent.DatabaseId]
        );
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, depReq, depMeta);

        var (bothReq, bothMeta) = WorkflowTestHelper.CreateRequest(
            instanceGuid: parent.InstanceInformation.InstanceGuid,
            startAt: DateTimeOffset.UtcNow.AddHours(2),
            dependencies: [parent.DatabaseId]
        );
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, bothReq, bothMeta);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var count = await queryRepo.CountScheduledWorkflows(TestContext.Current.CancellationToken);

        Assert.Equal(3, count);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_UpdatesMultipleWorkflowsAndStepsInSingleBatch()
    {
        // Arrange: create two workflows via npgsql enqueue
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request1 = new WorkflowRequest
        {
            OperationId = "next",
            Steps =
            [
                new StepRequest { Command = new Command.AppCommand("step-1a") },
                new StepRequest { Command = new Command.AppCommand("step-1b") },
            ],
        };
        var metadata1 = new WorkflowRequestMetadata(
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
        var workflow1 = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request1, metadata1);

        var request2 = new WorkflowRequest
        {
            OperationId = "next",
            Steps = [new StepRequest { Command = new Command.AppCommand("step-2a") }],
        };
        var metadata2 = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 50001234,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: new Actor { UserIdOrOrgNumber = "67890" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );
        var workflow2 = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request2, metadata2);

        // Act: mutate in-memory state and call the new batch method
        workflow1.Status = PersistentItemStatus.Completed;
        workflow1.EngineTraceContext = GetRandomTraceContext();
        var step1a = workflow1.Steps[0];
        step1a.Status = PersistentItemStatus.Completed;
        var step1b = workflow1.Steps[1];
        step1b.Status = PersistentItemStatus.Failed;
        step1b.RequeueCount = 3;
        step1b.StateOut = """{"error":"timeout"}""";

        workflow2.Status = PersistentItemStatus.Failed;
        workflow2.EngineTraceContext = GetRandomTraceContext();
        var step2a = workflow2.Steps[0];
        step2a.Status = PersistentItemStatus.Failed;
        step2a.RequeueCount = 1;
        var updates = new List<BatchWorkflowStatusUpdate>
        {
            new(workflow1, [step1a, step1b]),
            new(workflow2, [step2a]),
        };

        await repo.BatchUpdateWorkflowsAndSteps(updates, TestContext.Current.CancellationToken);

        // Assert: verify all changes persisted
        var dbWorkflow1 = await fixture.GetWorkflow(workflow1.DatabaseId);
        Assert.NotNull(dbWorkflow1);
        Assert.Equal(PersistentItemStatus.Completed, dbWorkflow1.Status);
        Assert.NotNull(dbWorkflow1.UpdatedAt);

        var dbWorkflow2 = await fixture.GetWorkflow(workflow2.DatabaseId);
        Assert.NotNull(dbWorkflow2);
        Assert.Equal(PersistentItemStatus.Failed, dbWorkflow2.Status);
        Assert.NotNull(dbWorkflow2.UpdatedAt);

        var dbStep1a = await fixture.GetStep(step1a.DatabaseId);
        Assert.NotNull(dbStep1a);
        Assert.Equal(PersistentItemStatus.Completed, dbStep1a.Status);
        Assert.NotNull(dbStep1a.UpdatedAt);

        var dbStep1b = await fixture.GetStep(step1b.DatabaseId);
        Assert.NotNull(dbStep1b);
        Assert.Equal(PersistentItemStatus.Failed, dbStep1b.Status);
        Assert.Equal(3, dbStep1b.RequeueCount);
        Assert.Equal("""{"error":"timeout"}""", dbStep1b.StateOut);
        Assert.NotNull(dbStep1b.UpdatedAt);

        var dbStep2a = await fixture.GetStep(step2a.DatabaseId);
        Assert.NotNull(dbStep2a);
        Assert.Equal(PersistentItemStatus.Failed, dbStep2a.Status);
        Assert.Equal(1, dbStep2a.RequeueCount);
        Assert.NotNull(dbStep2a.UpdatedAt);
    }

    [Fact]
    public async Task GetSuccessfulWorkflows_ReturnsOnlyCompleted()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var instanceGuid = Guid.NewGuid();

        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            instanceGuid: instanceGuid
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid
        );
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            instanceGuid: instanceGuid
        );
        var depFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            instanceGuid: instanceGuid
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var instanceGuid = Guid.NewGuid();
        var retryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(2),
            maxRetries: 5,
            maxDelay: TimeSpan.FromMinutes(1)
        );
        var request = new WorkflowRequest
        {
            OperationId = "op-domain-model",
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

        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

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
        var repo = fixture.CreateRepository();

        // Insert workflows across multiple (org, app) combinations, including duplicates
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed); // ttd / test-app (default)
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed); // ttd / test-app (duplicate)

        var (req2, meta2) = WorkflowTestHelper.CreateRequest(org: "digdir", app: "beta-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req2, meta2);

        var (req3, meta3) = WorkflowTestHelper.CreateRequest(org: "ttd", app: "other-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req3, meta3);

        var (req4, meta4) = WorkflowTestHelper.CreateRequest(org: "digdir", app: "beta-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req4, meta4);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();
        var instanceGuid = Guid.NewGuid();

        // Insert 4 completed workflows and 1 failed
        for (int i = 0; i < 4; i++)
        {
            await WorkflowTestHelper.InsertAndSetStatus(
                repo,
                context,
                PersistentItemStatus.Completed,
                instanceGuid: instanceGuid
            );
        }

        await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Failed,
            instanceGuid: instanceGuid
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
        var repo = fixture.CreateRepository();

        // InsertAndSetStatus sets DB status via raw SQL. We also call UpdateWorkflow to set UpdatedAt.
        var wf1 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            org: "org-a",
            app: "app-a"
        );
        wf1.Status = PersistentItemStatus.Completed;
        await repo.UpdateWorkflow(wf1, cancellationToken: TestContext.Current.CancellationToken);

        var wf2 = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            org: "org-b",
            app: "app-b"
        );
        wf2.Status = PersistentItemStatus.Completed;
        await repo.UpdateWorkflow(wf2, cancellationToken: TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

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
