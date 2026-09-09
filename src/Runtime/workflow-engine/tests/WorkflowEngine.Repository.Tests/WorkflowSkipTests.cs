using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Tests for the operator-skip compare-and-set: an unsuccessful terminal workflow (<c>Failed</c>, <c>Canceled</c>
/// or <c>DependencyFailed</c>) moves to <c>Skipped</c> together with every step that did not complete, the reason
/// on the first of them and error history left in place; any other state is a no-op, and the enqueue idempotency
/// key is kept.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class WorkflowSkipTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Reason = "Skipped manually by an operator";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Theory]
    [InlineData(PersistentItemStatus.Failed, PersistentItemStatus.Failed)]
    [InlineData(PersistentItemStatus.Canceled, PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.DependencyFailed, PersistentItemStatus.Enqueued)]
    public async Task SkipWorkflow_UnsuccessfulTerminalWorkflow_SkipsWorkflowAndEveryOpenStep(
        PersistentItemStatus status,
        PersistentItemStatus openStepStatus
    )
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await InsertThreeStepWorkflow(repo, context, status, openStepStatus);

        var result = await repo.SkipWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(result);
        Assert.Equal(workflow.DatabaseId, result.WorkflowId);
        Assert.Null(result.IsHead);

        var reloaded = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(reloaded);
        Assert.Equal(PersistentItemStatus.Skipped, reloaded.Status);
        Assert.Null(reloaded.BackoffUntil);

        var steps = reloaded.Steps.OrderBy(s => s.ProcessingOrder).ToList();
        Assert.Equal(3, steps.Count);
        Assert.Equal(PersistentItemStatus.Completed, steps[0].Status);
        Assert.Null(steps[0].SkipReason);
        Assert.Equal(PersistentItemStatus.Skipped, steps[1].Status);
        Assert.Equal(Reason, steps[1].SkipReason);
        Assert.Equal("boom", Assert.Single(steps[1].ErrorHistory).Message);
        Assert.Equal(PersistentItemStatus.Skipped, steps[2].Status);
        Assert.Null(steps[2].SkipReason);
        Assert.Empty(steps[2].ErrorHistory);
    }

    [Fact]
    public async Task SkipWorkflow_WithoutReason_LeavesSkipReasonNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await InsertThreeStepWorkflow(
            repo,
            context,
            PersistentItemStatus.Failed,
            PersistentItemStatus.Failed
        );

        var result = await repo.SkipWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            reason: null,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(result);
        var reloaded = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(reloaded);
        Assert.Equal(PersistentItemStatus.Skipped, reloaded.Status);
        Assert.All(reloaded.Steps, s => Assert.Null(s.SkipReason));
        Assert.Equal(
            [PersistentItemStatus.Completed, PersistentItemStatus.Skipped, PersistentItemStatus.Skipped],
            reloaded.Steps.OrderBy(s => s.ProcessingOrder).Select(s => s.Status)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SkipWorkflow_ReturnsHeadVisibilityDirective(bool isHead)
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET is_head = {isHead} WHERE id = {workflow.DatabaseId}",
            TestContext.Current.CancellationToken
        );

        var result = await repo.SkipWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(result);
        Assert.Equal(isHead, result.IsHead);
    }

    [Theory]
    [InlineData(PersistentItemStatus.Enqueued)]
    [InlineData(PersistentItemStatus.Processing)]
    [InlineData(PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.Waiting)]
    [InlineData(PersistentItemStatus.Held)]
    [InlineData(PersistentItemStatus.Completed)]
    [InlineData(PersistentItemStatus.Skipped)]
    public async Task SkipWorkflow_FromAnyOtherStatus_IsNoOp(PersistentItemStatus status)
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, status);

        var result = await repo.SkipWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );

        Assert.Null(result);
        var reloaded = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(reloaded);
        Assert.Equal(status, reloaded.Status);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
        Assert.Null(step.SkipReason);
    }

    [Fact]
    public async Task SkipWorkflow_WrongNamespace_IsNoOp()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed);

        var result = await repo.SkipWorkflow(
            workflow.DatabaseId,
            "wrong-namespace",
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );

        Assert.Null(result);
        var reloaded = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(reloaded);
        Assert.Equal(PersistentItemStatus.Failed, reloaded.Status);
    }

    [Fact]
    public async Task SkipWorkflow_DoesNotReleaseIdempotencyKey()
    {
        // A skip is not a retry ticket: the same fingerprint still deduplicates onto the skipped
        // workflow for the key row's lifetime, exactly as it does onto a completed one.
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var (request, metadata, ns, _) = WorkflowTestHelper.CreateRequest();
        var shared = metadata with { Namespace = ns, IdempotencyKey = "key-kept-after-skip" };
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(shared.IdempotencyKey));
        BufferedEnqueueRequest Buffered() =>
            new(
                new WorkflowEnqueueRequest { Workflows = [request] },
                shared,
                hash,
                new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
            );

        var created = Assert.Single(
            await repo.BatchEnqueueWorkflows([Buffered()], TestContext.Current.CancellationToken)
        );
        Assert.Equal(BatchEnqueueResultStatus.Created, created.Status);
        var workflowId = Assert.Single(created.WorkflowIds!);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET status = {(int)PersistentItemStatus.Failed} WHERE id = {workflowId}",
            TestContext.Current.CancellationToken
        );

        var result = await repo.SkipWorkflow(
            workflowId,
            ns,
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(result);

        var replay = Assert.Single(
            await repo.BatchEnqueueWorkflows([Buffered()], TestContext.Current.CancellationToken)
        );
        Assert.Equal(BatchEnqueueResultStatus.Duplicate, replay.Status);
        Assert.Equal(created.WorkflowIds, replay.WorkflowIds);
    }

    /// <summary>
    /// Synthesizes a three-step workflow the way a failed run leaves one: the first step completed, the second in
    /// <paramref name="openStepStatus"/> with one error entry, the third never reached, and a pending backoff on
    /// the workflow.
    /// </summary>
    private static async Task<Workflow> InsertThreeStepWorkflow(
        IEngineRepository repo,
        EngineDbContext context,
        PersistentItemStatus status,
        PersistentItemStatus openStepStatus
    )
    {
        var (_, metadata, ns, labels) = WorkflowTestHelper.CreateRequest();
        var request = new WorkflowRequest
        {
            OperationId = "next",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step-0",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "step-1",
                    Command = new CommandDefinition { Type = "app" },
                },
                new StepRequest
                {
                    OperationId = "step-2",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };
        var workflow = await WorkflowTestHelper.EnqueueWorkflow(
            repo,
            context,
            request,
            metadata,
            ns: ns,
            labels: labels
        );

        var backoffUntil = DateTimeOffset.UtcNow.AddMinutes(10);
        await context.Database.ExecuteSqlAsync(
            $"""
            UPDATE engine.workflows
            SET status = {(int)status}, backoff_until = {backoffUntil}
            WHERE id = {workflow.DatabaseId}
            """,
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET status = {(int)PersistentItemStatus.Completed} WHERE job_id = {workflow.DatabaseId} AND processing_order = 0",
            TestContext.Current.CancellationToken
        );
        var errorHistory = JsonSerializer.Serialize(
            new[] { new ErrorEntry(DateTimeOffset.UtcNow.AddMinutes(-1), "boom", 500, WasRetryable: false) },
            JsonOptions.Default
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET status = {(int)openStepStatus}, error_history = {errorHistory}::jsonb WHERE job_id = {workflow.DatabaseId} AND processing_order = 1",
            TestContext.Current.CancellationToken
        );
        return workflow;
    }
}
