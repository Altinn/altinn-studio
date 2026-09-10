using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Persistence of <see cref="Workflow.ExecutionStartedAt"/> and <see cref="Step.ExecutionStartedAt"/>. The
/// handler stamps them in memory on every attempt; they only reach a status read if the write-back carries
/// them, and resume has to treat them like the other per-attempt anchors it resets.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ExecutionStartedAtPersistenceTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _t0 = new(2026, 3, 19, 10, 0, 1, TimeSpan.Zero);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Enqueue_LeavesExecutionStartedAtNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Null(dbWorkflow.ExecutionStartedAt);
        Assert.Null(Assert.Single(dbWorkflow.Steps).ExecutionStartedAt);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_RoundTripsExecutionStartedAt_OnWorkflowAndStep()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var step = Assert.Single(workflow.Steps);

        // Two distinct instants, so a swapped or shared column cannot pass.
        var workflowStartedAt = _t0;
        var stepStartedAt = _t0.AddMilliseconds(250);
        workflow.Status = PersistentItemStatus.Processing;
        workflow.ExecutionStartedAt = workflowStartedAt;
        step.Status = PersistentItemStatus.Processing;
        step.ExecutionStartedAt = stepStartedAt;

        var result = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [step])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], result.Accepted);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(workflowStartedAt, dbWorkflow.ExecutionStartedAt);
        Assert.Equal(stepStartedAt, Assert.Single(dbWorkflow.Steps).ExecutionStartedAt);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_LaterAttempt_OverwritesTheStamp()
    {
        // The column is the start of the *most recent* attempt, so a second write-back moves it.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var step = Assert.Single(workflow.Steps);

        // Stays Processing across both write-backs, as a step that deferred and re-ran would: leaving
        // Processing clears the lease token, and a second write-back would then be CAS-rejected.
        workflow.Status = PersistentItemStatus.Processing;
        workflow.ExecutionStartedAt = _t0;
        step.ExecutionStartedAt = _t0;
        var first = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [step])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], first.Accepted);

        var secondAttempt = _t0.AddMinutes(5);
        workflow.ExecutionStartedAt = secondAttempt;
        step.ExecutionStartedAt = secondAttempt;
        var second = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [step])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], second.Accepted);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(secondAttempt, dbWorkflow.ExecutionStartedAt);
        Assert.Equal(secondAttempt, Assert.Single(dbWorkflow.Steps).ExecutionStartedAt);
    }

    [Fact]
    public async Task BatchUpdateWorkflowsAndSteps_StepNotDirty_KeepsItsStoredStamp()
    {
        // Only the dirty steps are written; a step left out of the batch keeps what the last write-back stored.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        var step = Assert.Single(workflow.Steps);

        workflow.Status = PersistentItemStatus.Processing;
        step.ExecutionStartedAt = _t0;
        var first = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [step])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], first.Accepted);

        step.ExecutionStartedAt = null;
        var second = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], second.Accepted);

        var dbStep = await fixture.GetStep(step.DatabaseId);
        Assert.NotNull(dbStep);
        Assert.Equal(_t0, dbStep.ExecutionStartedAt);
    }

    [Fact]
    public async Task ResumeWorkflow_ClearsTheStamp_OnTheWorkflowAndUnfinishedSteps_KeepsCompletedSteps()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var request = new WorkflowRequest
        {
            OperationId = "resume-stamps",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "done",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "failed",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var metadata = new WorkflowRequestMetadata(
            "test-namespace",
            Guid.NewGuid().ToString("N"),
            null,
            DateTimeOffset.UtcNow,
            null
        );
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata);
        await WorkflowTestHelper.AssignLeaseToken(context, workflow);

        // A completed first step and a failed second one, both stamped, written through the real path.
        var completedStep = workflow.Steps[0];
        var failedStep = workflow.Steps[1];
        workflow.Status = PersistentItemStatus.Failed;
        workflow.ExecutionStartedAt = _t0;
        completedStep.Status = PersistentItemStatus.Completed;
        completedStep.ExecutionStartedAt = _t0;
        failedStep.Status = PersistentItemStatus.Failed;
        failedStep.ExecutionStartedAt = _t0.AddSeconds(1);
        var written = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [completedStep, failedStep])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], written.Accepted);

        // The stamps are really there before the resume, so the nulls below are the resume's doing.
        var before = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(before);
        Assert.Equal(_t0, before.ExecutionStartedAt);
        Assert.Equal(
            _t0.AddSeconds(1),
            before.Steps.Single(s => s.DatabaseId == failedStep.DatabaseId).ExecutionStartedAt
        );

        var resumed = await repo.ResumeWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            cascade: false,
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], resumed);

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Null(dbWorkflow.ExecutionStartedAt);

        var dbCompleted = dbWorkflow.Steps.Single(s => s.DatabaseId == completedStep.DatabaseId);
        var dbFailed = dbWorkflow.Steps.Single(s => s.DatabaseId == failedStep.DatabaseId);

        // The completed step never re-executes, so its last attempt's duration stays readable.
        Assert.Equal(PersistentItemStatus.Completed, dbCompleted.Status);
        Assert.Equal(_t0, dbCompleted.ExecutionStartedAt);

        // The step that will run again is back to never-started, like its other per-attempt anchors.
        Assert.Equal(PersistentItemStatus.Enqueued, dbFailed.Status);
        Assert.Null(dbFailed.ExecutionStartedAt);
    }

    [Fact]
    public async Task ResumeWorkflow_Cascade_ClearsTheStampOnResumedDependents()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        const string ns = "cascade-stamps";
        var primary = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);
        var dependent = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [primary.DatabaseId]
        );

        // A dependent settled as DependencyFailed was still picked up by a worker, so it carries a stamp.
        dependent.Status = PersistentItemStatus.DependencyFailed;
        dependent.ExecutionStartedAt = _t0;
        var written = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(dependent, [])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([dependent.DatabaseId], written.Accepted);
        Assert.Equal(_t0, (await fixture.GetWorkflow(dependent.DatabaseId))?.ExecutionStartedAt);

        var resumed = await repo.ResumeWorkflow(
            primary.DatabaseId,
            primary.Namespace,
            DateTimeOffset.UtcNow,
            cascade: true,
            TestContext.Current.CancellationToken
        );
        Assert.Contains(dependent.DatabaseId, resumed);

        var dbDependent = await fixture.GetWorkflow(dependent.DatabaseId);
        Assert.NotNull(dbDependent);
        Assert.Equal(PersistentItemStatus.Enqueued, dbDependent.Status);
        Assert.Null(dbDependent.ExecutionStartedAt);
    }

    [Fact]
    public async Task ReclaimStaleWorkflows_ClearsTheStamp_OnTheReclaimedWorkflow()
    {
        // A reclaimed workflow goes back to Enqueued for another worker. Like resume, it must not carry
        // the dead attempt's stamp into the queue: an Enqueued workflow never has one.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();

        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Processing);
        workflow.Status = PersistentItemStatus.Processing;
        workflow.ExecutionStartedAt = _t0;
        var written = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(workflow, [])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([workflow.DatabaseId], written.Accepted);

        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET heartbeat_at = {DateTimeOffset.UtcNow.AddSeconds(-30)}, reclaim_count = 0
            WHERE id = {workflow.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );

        await maintenance.ReclaimStaleWorkflows(
            DateTimeOffset.UtcNow,
            fixture.Settings,
            TestContext.Current.CancellationToken
        );

        var dbWorkflow = await fixture.GetWorkflow(workflow.DatabaseId);
        Assert.NotNull(dbWorkflow);
        Assert.Equal(PersistentItemStatus.Enqueued, dbWorkflow.Status);
        Assert.Null(dbWorkflow.ExecutionStartedAt);
    }

    [Fact]
    public async Task RecoverDependencyResolvedWorkflows_ClearsTheStamp_OnTheReEnqueuedChild()
    {
        // The DependencyFailed early exit runs after the worker stamped the workflow, so without the
        // clear a recovered child would re-enter the queue carrying that stamp.
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
        child.Status = PersistentItemStatus.DependencyFailed;
        child.ExecutionStartedAt = _t0;
        var written = await repo.BatchUpdateWorkflowsAndSteps(
            [new BatchWorkflowStatusUpdate(child, [])],
            TestContext.Current.CancellationToken
        );
        Assert.Equal([child.DatabaseId], written.Accepted);
        Assert.Equal(_t0, (await fixture.GetWorkflow(child.DatabaseId))?.ExecutionStartedAt);

        await maintenance.RecoverDependencyResolvedWorkflows(
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var dbChild = await fixture.GetWorkflow(child.DatabaseId);
        Assert.NotNull(dbChild);
        Assert.Equal(PersistentItemStatus.Enqueued, dbChild.Status);
        Assert.Null(dbChild.ExecutionStartedAt);
    }
}
