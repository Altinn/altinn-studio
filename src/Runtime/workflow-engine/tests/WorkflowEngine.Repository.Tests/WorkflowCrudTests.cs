using System.Diagnostics;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowCrudTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

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

        var (_, metadata, tid, labels) = WorkflowTestHelper.CreateRequest();

        var requests = new List<WorkflowRequest>
        {
            new()
            {
                Ref = "wf-a",
                OperationId = "op-a",
                Steps =
                [
                    new StepRequest
                    {
                        OperationId = "step-a",
                        Command = new CommandDefinition { Type = "app" },
                    },
                ],
            },
            new()
            {
                Ref = "wf-b",
                OperationId = "op-b",
                Steps =
                [
                    new StepRequest
                    {
                        OperationId = "step-b",
                        Command = new CommandDefinition { Type = "app" },
                    },
                ],
                Links = [(WorkflowRef)"wf-a"],
            },
        };

        var results = await WorkflowTestHelper.EnqueueWorkflows(repo, metadata, requests, ns: tid, labels: labels);
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
    public async Task EnqueueBatch_WithCrossNamespaceLink_ReturnsInvalidReference()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var (requestA, metadataA, tidA, labelsA) = WorkflowTestHelper.CreateRequest();
        var workflowA = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            requestA,
            metadataA,
            ns: tidA,
            labels: labelsA
        );

        var (_, metadataB, tidB, labelsB) = WorkflowTestHelper.CreateRequest();
        var requestB = new WorkflowRequest
        {
            OperationId = "op-b",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step-b",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
            Links = [(WorkflowRef)workflowA.DatabaseId],
        };

        var results = await WorkflowTestHelper.EnqueueWorkflows(repo, metadataB, [requestB], ns: tidB, labels: labelsB);
        var result = Assert.Single(results);
        Assert.Equal(BatchEnqueueResultStatus.InvalidReference, result.Status);
        Assert.Null(result.WorkflowIds);
    }

    [Fact]
    public async Task GetActiveWorkflows_ReturnsNonTerminal()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        // Insert one workflow in each relevant status
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            ns: ns
        );
        var processing = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Processing,
            ns: ns
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            ns: ns
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);

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

        var activeResult = await queryRepo.GetActiveWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Active = workflows with incomplete status (Enqueued, Processing, Requeued)
        Assert.Equal(2, activeResult.Workflows.Count);
        Assert.Contains(activeResult.Workflows, w => w.DatabaseId == enqueued.DatabaseId);
        Assert.Contains(activeResult.Workflows, w => w.DatabaseId == processing.DatabaseId);
        Assert.DoesNotContain(activeResult.Workflows, w => w.DatabaseId == completed.DatabaseId);
        Assert.DoesNotContain(activeResult.Workflows, w => w.DatabaseId == failed.DatabaseId);
    }

    [Fact]
    public async Task GetFailedWorkflows_ReturnsFailed()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        var requeued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Requeued,
            ns: ns
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);
        var dependencyFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns
        );
        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            ns: ns
        );
        var canceled = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Canceled,
            ns: ns
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var failedStatuses = PersistentItemStatusMap.Failed.ToList();
        var queryResult = await queryRepo.QueryWorkflows(
            pageSize: 100,
            statuses: failedStatuses,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(3, queryResult.Workflows.Count);
        Assert.Contains(queryResult.Workflows, w => w.DatabaseId == canceled.DatabaseId);
        Assert.Contains(queryResult.Workflows, w => w.DatabaseId == failed.DatabaseId);
        Assert.Contains(queryResult.Workflows, w => w.DatabaseId == dependencyFailed.DatabaseId);
        Assert.DoesNotContain(queryResult.Workflows, w => w.DatabaseId == completed.DatabaseId);
        Assert.DoesNotContain(queryResult.Workflows, w => w.DatabaseId == requeued.DatabaseId);
    }

    [Fact]
    public async Task UpdateWorkflow_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        workflow.Status = PersistentItemStatus.Processing;
        await repo.UpdateWorkflow(workflow, cancellationToken: TestContext.Current.CancellationToken);

        var status = await repo.GetWorkflowStatus(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var status = await repo.GetWorkflowStatus(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );

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
        var status = await repo.GetWorkflowStatus(
            nonExistentId,
            "nonexistent-ns",
            TestContext.Current.CancellationToken
        );

        Assert.Null(status);
        Assert.Null(await fixture.GetWorkflow(nonExistentId));
    }

    [Fact]
    public async Task UpdateStep_ChangesStatus()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest(startAt: startAt);

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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);
        var step = workflow.Steps[0];
        step.Status = PersistentItemStatus.Requeued;
        await repo.UpdateStep(step, cancellationToken: TestContext.Current.CancellationToken);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var activeResult = await queryRepo.GetActiveWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Single(activeResult.Workflows);
        Assert.Equal(workflow.DatabaseId, activeResult.Workflows[0].DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsFutureDated()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (futureRequest, futureMetadata, _, _) = WorkflowTestHelper.CreateRequest(
            startAt: DateTimeOffset.UtcNow.AddHours(1)
        );
        var futureWorkflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, futureRequest, futureMetadata);
        var (immediateRequest, immediateMetadata, _, _) = WorkflowTestHelper.CreateRequest();
        var immediateWorkflow = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            immediateRequest,
            immediateMetadata
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduledResult = await queryRepo.GetScheduledWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Single(scheduledResult.Workflows);
        Assert.Equal(futureWorkflow.DatabaseId, scheduledResult.Workflows[0].DatabaseId);
        Assert.DoesNotContain(scheduledResult.Workflows, w => w.DatabaseId == immediateWorkflow.DatabaseId);
    }

    [Fact]
    public async Task GetScheduledWorkflows_ReturnsWorkflowBlockedByDependency()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // A: Enqueued (non-terminal) — its dependents should appear as scheduled
        var (requestA, metadataA, tidA, labelsA) = WorkflowTestHelper.CreateRequest();
        var workflowA = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            requestA,
            metadataA,
            ns: tidA,
            labels: labelsA
        );

        // B: depends on A (blocked by non-terminal dependency)
        var (requestB, metadataB, _, _) = WorkflowTestHelper.CreateRequest(
            ns: workflowA.Namespace,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            requestB,
            metadataB,
            ns: workflowA.Namespace
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduledResult = await queryRepo.GetScheduledWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Contains(scheduledResult.Workflows, w => w.DatabaseId == workflowB.DatabaseId);
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
        var (requestB, metadataB, _, _) = WorkflowTestHelper.CreateRequest(
            ns: workflowA.Namespace,
            dependencies: [workflowA.DatabaseId]
        );
        var workflowB = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context2,
            requestB,
            metadataB,
            ns: workflowA.Namespace
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var scheduledResult = await queryRepo.GetScheduledWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );
        var activeResult = await queryRepo.GetActiveWorkflows(
            pageSize: 100,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.DoesNotContain(scheduledResult.Workflows, w => w.DatabaseId == workflowB.DatabaseId);
        Assert.Contains(activeResult.Workflows, w => w.DatabaseId == workflowB.DatabaseId);
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
        var (parentRequest, parentMetadata, parentTid, parentLabels) = WorkflowTestHelper.CreateRequest();
        var parent = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            parentRequest,
            parentMetadata,
            ns: parentTid,
            labels: parentLabels
        );

        // Have to wait for either dependencies, start time, or both
        var (futureReq, futureMeta, _, _) = WorkflowTestHelper.CreateRequest(
            startAt: DateTimeOffset.UtcNow.AddHours(1)
        );
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, futureReq, futureMeta);

        var (depReq, depMeta, _, _) = WorkflowTestHelper.CreateRequest(
            ns: parent.Namespace,
            dependencies: [parent.DatabaseId]
        );
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, depReq, depMeta, ns: parent.Namespace);

        var (bothReq, bothMeta, _, _) = WorkflowTestHelper.CreateRequest(
            ns: parent.Namespace,
            startAt: DateTimeOffset.UtcNow.AddHours(2),
            dependencies: [parent.DatabaseId]
        );
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, bothReq, bothMeta, ns: parent.Namespace);

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
                new StepRequest
                {
                    OperationId = "step-1a",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "step-1b",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata1 = new WorkflowRequestMetadata(
            "test-namespace",
            Guid.NewGuid().ToString("N"),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            null
        );
        var workflow1 = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request1, metadata1);

        var request2 = new WorkflowRequest
        {
            OperationId = "next",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step-2a",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata2 = new WorkflowRequestMetadata(
            "test-namespace",
            Guid.NewGuid().ToString("N"),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            null
        );
        var workflow2 = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request2, metadata2);

        // Stamp a lease token on each row so write-back's compare-and-swap matches.
        await WorkflowTestHelper.AssignLeaseToken(context, workflow1);
        await WorkflowTestHelper.AssignLeaseToken(context, workflow2);

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
        var ns = Guid.NewGuid().ToString("N");

        var completed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Completed,
            ns: ns
        );
        var failed = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);
        var enqueued = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.Enqueued,
            ns: ns
        );
        var depFailed = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns
        );

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var queryResult = await queryRepo.QueryWorkflows(
            pageSize: 100,
            statuses: PersistentItemStatusMap.Successful.ToList(),
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Single(queryResult.Workflows);
        Assert.Equal(completed.DatabaseId, queryResult.Workflows[0].DatabaseId);
        Assert.DoesNotContain(queryResult.Workflows, w => w.DatabaseId == failed.DatabaseId);
        Assert.DoesNotContain(queryResult.Workflows, w => w.DatabaseId == enqueued.DatabaseId);
        Assert.DoesNotContain(queryResult.Workflows, w => w.DatabaseId == depFailed.DatabaseId);
    }

    [Fact]
    public async Task ToDomainModel_Step_ConvertsCorrectly()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var retryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(2),
            maxRetries: 5,
            maxDelay: TimeSpan.FromMinutes(1)
        );
        var request = new WorkflowRequest
        {
            OperationId = "op-domain-model",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step-one",
                    Command = new CommandDefinition { Type = "app" },
                    RetryStrategy = retryStrategy,
                    Labels = new Dictionary<string, string> { ["stepMeta"] = "one" },
                },
                new StepRequest
                {
                    OperationId = "webhook-hook",
                    Command = new CommandDefinition { Type = "webhook" },
                },
                new StepRequest
                {
                    OperationId = "step-three",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(
            "test-namespace",
            Guid.NewGuid().ToString("N"),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            null
        );

        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        // Fetch from DB via a fresh context to ensure full round-trip through EF
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(3, dbWorkflow.Steps.Count);

        // Step 0: app command with retry strategy
        var step0 = dbWorkflow.Steps[0];
        Assert.Equal(0, step0.ProcessingOrder);
        Assert.Equal("app", step0.Command.Type);
        Assert.Equal("step-one", step0.OperationId);
        Assert.NotNull(step0.RetryStrategy);
        Assert.Equal(BackoffType.Exponential, step0.RetryStrategy.BackoffType);
        Assert.Equal(5, step0.RetryStrategy.MaxRetries);
        Assert.Equal(PersistentItemStatus.Enqueued, step0.Status);

        // Step 1: webhook command
        var step1 = dbWorkflow.Steps[1];
        Assert.Equal(1, step1.ProcessingOrder);
        Assert.Equal("webhook", step1.Command.Type);
        Assert.Equal("webhook-hook", step1.OperationId);
        Assert.Null(step1.RetryStrategy);

        // Step 2: another app command (no retry strategy)
        var step2 = dbWorkflow.Steps[2];
        Assert.Equal(2, step2.ProcessingOrder);
        Assert.Equal("app", step2.Command.Type);
        Assert.Equal("step-three", step2.OperationId);
        Assert.Null(step2.RetryStrategy);
    }

    [Fact]
    public async Task GetDistinctLabelValues_ReturnsUniqueValues()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // Insert workflows across multiple org label values, including duplicates
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed); // ttd (default)
        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed); // ttd (duplicate)

        var (req2, meta2, tid2, labels2) = WorkflowTestHelper.CreateRequest(org: "digdir", app: "beta-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req2, meta2, ns: tid2, labels: labels2);

        var (req3, meta3, tid3, labels3) = WorkflowTestHelper.CreateRequest(org: "ttd", app: "other-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req3, meta3, ns: tid3, labels: labels3);

        var (req4, meta4, tid4, labels4) = WorkflowTestHelper.CreateRequest(org: "digdir", app: "beta-app");
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, req4, meta4, ns: tid4, labels: labels4);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        var orgs = await queryRepo.GetDistinctLabelValues("org", ns: null, TestContext.Current.CancellationToken);

        Assert.Equal(2, orgs.Count);
        Assert.Contains("digdir", orgs);
        Assert.Contains("ttd", orgs);
    }

    [Fact]
    public async Task QueryWorkflows_ReturnsWorkflowsAndTotalCount()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var ns = Guid.NewGuid().ToString("N");

        // Insert 4 completed workflows and 1 failed
        for (int i = 0; i < 4; i++)
        {
            await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Completed, ns: ns);
        }

        await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);

        await using var queryContext = fixture.CreateDbContext();
        var queryRepo = fixture.CreateRepository();

        // Page of 2 from completed workflows
        var statuses = PersistentItemStatusMap.Successful.ToList();
        var result = await queryRepo.QueryWorkflows(
            pageSize: 2,
            statuses: statuses,
            includeTotalCount: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(4, result.TotalCount);
        Assert.Equal(2, result.Workflows.Count);
        Assert.All(result.Workflows, w => Assert.Equal(PersistentItemStatus.Completed, w.Status));
    }

    [Fact]
    public async Task QueryWorkflows_FiltersCorrectly()
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

        // Filter by org label
        var byOrg = await queryRepo.QueryWorkflows(
            pageSize: 100,
            statuses: statuses,
            includeTotalCount: true,
            labelFilters: new Dictionary<string, string> { ["org"] = "org-a" },
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, byOrg.TotalCount);
        Assert.Single(byOrg.Workflows);
        Assert.Equal(wf1.DatabaseId, byOrg.Workflows[0].DatabaseId);

        // Search by namespace (text search applies to Namespace and OperationId)
        var bySearch = await queryRepo.QueryWorkflows(
            pageSize: 100,
            statuses: statuses,
            includeTotalCount: true,
            search: wf2.Namespace,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, bySearch.TotalCount);
        Assert.Single(bySearch.Workflows);
    }
}
