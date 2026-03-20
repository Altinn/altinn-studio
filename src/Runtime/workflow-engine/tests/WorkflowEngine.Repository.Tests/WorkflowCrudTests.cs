using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
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

        var active = await queryRepo.GetActiveWorkflows(cancellationToken: TestContext.Current.CancellationToken);

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
        var (results, _) = await queryRepo.QueryWorkflowsWithCount(
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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
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

        var active = await queryRepo.GetActiveWorkflows(cancellationToken: TestContext.Current.CancellationToken);

        Assert.Single(active);
        Assert.Equal(workflow.DatabaseId, active[0].DatabaseId);
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

        var scheduled = await queryRepo.GetScheduledWorkflows(TestContext.Current.CancellationToken);
        var active = await queryRepo.GetActiveWorkflows(cancellationToken: TestContext.Current.CancellationToken);

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
        var metadata1 = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
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
        var metadata2 = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
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

        // With per-step flushing, each update carries a single step.
        // Multiple updates for the same workflow (one per step) are batched together.
        var updates = new List<BatchWorkflowStatusUpdate>
        {
            new(workflow1, step1a),
            new(workflow1, step1b),
            new(workflow2, step2a),
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

        var (results, _) = await queryRepo.QueryWorkflowsWithCount(
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
        var ns = Guid.NewGuid().ToString("N");
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
        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);

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
        Assert.NotNull(step0.IdempotencyKey);

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

        var orgs = await queryRepo.GetDistinctLabelValues("org", TestContext.Current.CancellationToken);

        Assert.Equal(2, orgs.Count);
        Assert.Contains("digdir", orgs);
        Assert.Contains("ttd", orgs);
    }

    [Fact]
    public async Task GetWorkflow_ByIdempotencyKey_ReturnsMatch()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
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
        var (request, metadata, _, _) = WorkflowTestHelper.CreateRequest();
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
    public async Task QueryWorkflowsWithCount_ReturnsWorkflowsAndTotalCount()
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
        var (workflows, totalCount) = await queryRepo.QueryWorkflowsWithCount(
            statuses,
            take: 2,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(4, totalCount);
        Assert.Equal(2, workflows.Count);
        Assert.All(workflows, w => Assert.Equal(PersistentItemStatus.Completed, w.Status));
    }

    [Fact]
    public async Task QueryWorkflowsWithCount_FiltersCorrectly()
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
        var (byOrg, orgCount) = await queryRepo.QueryWorkflowsWithCount(
            statuses,
            labelFilters: new Dictionary<string, string> { ["org"] = "org-a" },
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, orgCount);
        Assert.Single(byOrg);
        Assert.Equal(wf1.DatabaseId, byOrg[0].DatabaseId);

        // Search by namespace (text search applies to Namespace and OperationId)
        var (bySearch, searchCount) = await queryRepo.QueryWorkflowsWithCount(
            statuses,
            search: wf2.Namespace,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(1, searchCount);
        Assert.Single(bySearch);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WritesEnqueuedInsteadOfSuspended_WhenConcurrentReplyTransitionedStep()
    {
        // This test simulates the race condition where a concurrent reply submission
        // transitions a step from Suspended to Enqueued while the processor still holds
        // a stale in-memory snapshot showing the step as Suspended. Without the fix,
        // the processor would write Suspended, permanently stranding the workflow.

        // Arrange: create a workflow with producer + consumer steps
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request = new WorkflowRequest
        {
            OperationId = "race-condition-test",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "producer",
                    Ref = "producer",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumer",
                    WaitForReplyFrom = "producer",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        // Verify initial state: workflow is Enqueued, producer step is Enqueued, consumer step is Suspended
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);
        var producerStep = workflow.Steps.Single(s => s.OperationId == "producer");
        var consumerStep = workflow.Steps.Single(s => s.OperationId == "consumer");
        Assert.Equal(PersistentItemStatus.Enqueued, producerStep.Status);
        Assert.Equal(PersistentItemStatus.Suspended, consumerStep.Status);

        // Simulate: processor completes the producer step in memory
        producerStep.Status = PersistentItemStatus.Completed;

        // Simulate: the processor's in-memory view still sees consumer as Suspended
        // (the stale snapshot), so OverallStatus() returns Suspended
        workflow.Status = PersistentItemStatus.Suspended;

        // Simulate: concurrent reply has transitioned the consumer step from Suspended
        // to Enqueued in the database (this is what BulkTransitionSteps does)
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "engine"."Steps" SET "Status" = {(int)PersistentItemStatus.Enqueued} WHERE "Id" = {consumerStep.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        // Act: processor writes back its stale state via batch update.
        // First flush: producer step completed (would have happened during processing).
        var producerUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, producerStep) };
        await repo.BatchUpdateWorkflowsAndSteps(producerUpdate, TestContext.Current.CancellationToken);

        // Second flush: processor broke on consumer step (Suspended), passing it as the
        // step the SQL guard should check. The consumer step's in-memory status is still
        // Suspended (stale), but the DB has it as Enqueued from the concurrent reply.
        var suspendedUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, consumerStep) };
        await repo.BatchUpdateWorkflowsAndSteps(suspendedUpdate, TestContext.Current.CancellationToken);

        // Assert: workflow should be Enqueued (not Suspended), because the SQL detected
        // that no steps are actually Suspended in the DB anymore
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);

        // The consumer step should still be Enqueued (from the simulated reply transition)
        var dbConsumerStep = await fixture.GetStep(consumerStep.DatabaseId);
        Assert.NotNull(dbConsumerStep);
        Assert.Equal(PersistentItemStatus.Enqueued, dbConsumerStep.Status);

        // The producer step should be Completed (written by the batch update)
        var dbProducerStep = await fixture.GetStep(producerStep.DatabaseId);
        Assert.NotNull(dbProducerStep);
        Assert.Equal(PersistentItemStatus.Completed, dbProducerStep.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WritesSuspended_WhenStepIsStillSuspended()
    {
        // Complementary test: when no concurrent reply arrived, the processor should
        // correctly write Suspended status (the normal non-race case).

        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request = new WorkflowRequest
        {
            OperationId = "no-race-test",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "producer",
                    Ref = "producer",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumer",
                    WaitForReplyFrom = "producer",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        // Simulate: processor completes the producer step, consumer is still Suspended
        var producerStep = workflow.Steps.Single(s => s.OperationId == "producer");
        producerStep.Status = PersistentItemStatus.Completed;
        workflow.Status = PersistentItemStatus.Suspended;

        // No concurrent reply -- consumer step is still Suspended in the DB

        // Act: two-phase flush, same as in the race condition test.
        // First flush: producer step completed.
        var producerUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, producerStep) };
        await repo.BatchUpdateWorkflowsAndSteps(producerUpdate, TestContext.Current.CancellationToken);

        // Second flush: processor broke on consumer step (Suspended), passing it as
        // the step the SQL guard should check. Consumer is still Suspended in the DB.
        var consumerStep = workflow.Steps.Single(s => s.OperationId == "consumer");
        var suspendedUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, consumerStep) };
        await repo.BatchUpdateWorkflowsAndSteps(suspendedUpdate, TestContext.Current.CancellationToken);

        // Assert: workflow should remain Suspended (normal case — step is still Suspended in DB)
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Suspended, dbWorkflow.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WritesEnqueued_WhenBrokenOnStepWasReplied_ButOtherStepStillSuspended()
    {
        // Multi-suspended-step scenario: two consumers both start Suspended.
        // A concurrent reply transitions consumer A from Suspended → Enqueued in the DB.
        // Consumer B is still Suspended in the DB.
        // The processor broke on consumer A (the one that was replied to).
        // The SQL guard checks consumer A's DB status (Enqueued ≠ Suspended) → override
        // workflow to Enqueued so it gets picked up again.

        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request = new WorkflowRequest
        {
            OperationId = "multi-suspended-replied-test",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "producerA",
                    Ref = "producerA",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "producerB",
                    Ref = "producerB",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumerA",
                    WaitForReplyFrom = "producerA",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumerB",
                    WaitForReplyFrom = "producerB",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var producerA = workflow.Steps.Single(s => s.OperationId == "producerA");
        var producerB = workflow.Steps.Single(s => s.OperationId == "producerB");
        var consumerA = workflow.Steps.Single(s => s.OperationId == "consumerA");
        var consumerB = workflow.Steps.Single(s => s.OperationId == "consumerB");

        Assert.Equal(PersistentItemStatus.Enqueued, producerA.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, producerB.Status);
        Assert.Equal(PersistentItemStatus.Suspended, consumerA.Status);
        Assert.Equal(PersistentItemStatus.Suspended, consumerB.Status);

        // Simulate: processor completes both producers
        producerA.Status = PersistentItemStatus.Completed;
        producerB.Status = PersistentItemStatus.Completed;
        workflow.Status = PersistentItemStatus.Suspended;

        // Simulate: concurrent reply transitions consumer A from Suspended → Enqueued in DB
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "engine"."Steps" SET "Status" = {(int)PersistentItemStatus.Enqueued} WHERE "Id" = {consumerA.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        // Act: first flush — producerA step completed
        var update1 = new List<BatchWorkflowStatusUpdate> { new(workflow, producerA) };
        await repo.BatchUpdateWorkflowsAndSteps(update1, TestContext.Current.CancellationToken);

        // Second flush — producerB step completed
        var update2 = new List<BatchWorkflowStatusUpdate> { new(workflow, producerB) };
        await repo.BatchUpdateWorkflowsAndSteps(update2, TestContext.Current.CancellationToken);

        // Third flush: processor broke on consumer A (the first Suspended step it hit).
        // Guard checks consumer A in DB → it's Enqueued → override workflow to Enqueued.
        var suspendedUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, consumerA) };
        await repo.BatchUpdateWorkflowsAndSteps(suspendedUpdate, TestContext.Current.CancellationToken);

        // Assert: workflow should be Enqueued (guard detected consumer A is no longer Suspended)
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);

        // Consumer A should be Enqueued (from concurrent reply, NOT overwritten by step update)
        var dbConsumerA = await fixture.GetStep(consumerA.DatabaseId);
        Assert.NotNull(dbConsumerA);
        Assert.Equal(PersistentItemStatus.Enqueued, dbConsumerA.Status);

        // Consumer B should still be Suspended (no reply arrived for it)
        var dbConsumerB = await fixture.GetStep(consumerB.DatabaseId);
        Assert.NotNull(dbConsumerB);
        Assert.Equal(PersistentItemStatus.Suspended, dbConsumerB.Status);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_WritesSuspended_WhenBrokenOnStepIsStillSuspended_ButOtherStepWasReplied()
    {
        // Multi-suspended-step scenario: two consumers both start Suspended.
        // A concurrent reply transitions consumer B from Suspended → Enqueued in the DB.
        // The processor broke on consumer A (which is still Suspended in the DB).
        // The SQL guard checks consumer A's DB status (Suspended = Suspended) → no override,
        // workflow stays Suspended. The next fetch cycle won't pick it up, but the reply
        // handler will separately re-enqueue once it can transition the workflow.

        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request = new WorkflowRequest
        {
            OperationId = "multi-suspended-not-replied-test",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "producerA",
                    Ref = "producerA",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "producerB",
                    Ref = "producerB",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumerA",
                    WaitForReplyFrom = "producerA",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "consumerB",
                    WaitForReplyFrom = "producerB",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(Guid.NewGuid(), DateTimeOffset.UtcNow, null);
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);

        var producerA = workflow.Steps.Single(s => s.OperationId == "producerA");
        var producerB = workflow.Steps.Single(s => s.OperationId == "producerB");
        var consumerA = workflow.Steps.Single(s => s.OperationId == "consumerA");
        var consumerB = workflow.Steps.Single(s => s.OperationId == "consumerB");

        Assert.Equal(PersistentItemStatus.Enqueued, producerA.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, producerB.Status);
        Assert.Equal(PersistentItemStatus.Suspended, consumerA.Status);
        Assert.Equal(PersistentItemStatus.Suspended, consumerB.Status);

        // Simulate: processor completes both producers
        producerA.Status = PersistentItemStatus.Completed;
        producerB.Status = PersistentItemStatus.Completed;
        workflow.Status = PersistentItemStatus.Suspended;

        // Simulate: concurrent reply transitions consumer B (NOT A) from Suspended → Enqueued in DB
        await context.Database.ExecuteSqlAsync(
            $"""UPDATE "engine"."Steps" SET "Status" = {(int)PersistentItemStatus.Enqueued} WHERE "Id" = {consumerB.DatabaseId}""",
            TestContext.Current.CancellationToken
        );

        // Act: first flush — producerA step completed
        var update1 = new List<BatchWorkflowStatusUpdate> { new(workflow, producerA) };
        await repo.BatchUpdateWorkflowsAndSteps(update1, TestContext.Current.CancellationToken);

        // Second flush — producerB step completed
        var update2 = new List<BatchWorkflowStatusUpdate> { new(workflow, producerB) };
        await repo.BatchUpdateWorkflowsAndSteps(update2, TestContext.Current.CancellationToken);

        // Third flush: processor broke on consumer A (still Suspended in DB).
        // Guard checks consumer A in DB → it's still Suspended → no override.
        var suspendedUpdate = new List<BatchWorkflowStatusUpdate> { new(workflow, consumerA) };
        await repo.BatchUpdateWorkflowsAndSteps(suspendedUpdate, TestContext.Current.CancellationToken);

        // Assert: workflow should remain Suspended (guard saw consumer A is still Suspended)
        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Suspended, dbWorkflow.Status);

        // Consumer A should still be Suspended (no reply for it)
        var dbConsumerA = await fixture.GetStep(consumerA.DatabaseId);
        Assert.NotNull(dbConsumerA);
        Assert.Equal(PersistentItemStatus.Suspended, dbConsumerA.Status);

        // Consumer B should be Enqueued (from concurrent reply)
        var dbConsumerB = await fixture.GetStep(consumerB.DatabaseId);
        Assert.NotNull(dbConsumerB);
        Assert.Equal(PersistentItemStatus.Enqueued, dbConsumerB.Status);
    }
}
