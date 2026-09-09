using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Tests for the manual-failure compare-and-set: a parked workflow (<c>Requeued</c> or <c>Waiting</c>)
/// and its parked step move to <c>Failed</c> together, with the reason recorded as a non-retryable error
/// entry; any other state is a no-op.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class WorkflowFailTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Reason = "Failed manually by an operator";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Theory]
    [InlineData(PersistentItemStatus.Requeued)]
    [InlineData(PersistentItemStatus.Waiting)]
    public async Task FailWorkflow_ParkedWorkflow_FailsWorkflowAndParkedStep(PersistentItemStatus parked)
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await ParkWorkflow(repo, context, parked);
        var failedAt = DateTimeOffset.UtcNow;

        var result = await repo.FailWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            failedAt,
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
        Assert.Equal(PersistentItemStatus.Failed, reloaded.Status);
        Assert.Null(reloaded.BackoffUntil);

        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        var entry = Assert.Single(step.ErrorHistory);
        Assert.Equal(Reason, entry.Message);
        Assert.False(entry.WasRetryable);
        Assert.Null(entry.HttpStatusCode);
        Assert.Equal(failedAt, entry.Timestamp);
    }

    [Fact]
    public async Task FailWorkflow_AppendsToExistingErrorHistory()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await ParkWorkflow(repo, context, PersistentItemStatus.Requeued);

        var earlier = new ErrorEntry(DateTimeOffset.UtcNow.AddMinutes(-1), "boom", 500, WasRetryable: true);
        var earlierJson = JsonSerializer.Serialize(new[] { earlier }, JsonOptions.Default);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET error_history = {earlierJson}::jsonb WHERE job_id = {workflow.DatabaseId}",
            TestContext.Current.CancellationToken
        );

        var result = await repo.FailWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            DateTimeOffset.UtcNow,
            Reason,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(result);
        var reloaded = await repo.GetWorkflow(
            workflow.DatabaseId,
            workflow.Namespace,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(reloaded);
        var history = Assert.Single(reloaded.Steps).ErrorHistory;
        Assert.Equal(2, history.Count);
        Assert.Equal("boom", history[0].Message);
        Assert.True(history[0].WasRetryable);
        Assert.Equal(Reason, history[1].Message);
        Assert.False(history[1].WasRetryable);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FailWorkflow_ReturnsHeadVisibilityDirective(bool isHead)
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await ParkWorkflow(repo, context, PersistentItemStatus.Waiting);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET is_head = {isHead} WHERE id = {workflow.DatabaseId}",
            TestContext.Current.CancellationToken
        );

        var result = await repo.FailWorkflow(
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
    [InlineData(PersistentItemStatus.Completed)]
    [InlineData(PersistentItemStatus.Failed)]
    [InlineData(PersistentItemStatus.Canceled)]
    [InlineData(PersistentItemStatus.DependencyFailed)]
    [InlineData(PersistentItemStatus.Abandoned)]
    [InlineData(PersistentItemStatus.Held)]
    public async Task FailWorkflow_NotParked_IsNoOp(PersistentItemStatus status)
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, status);

        var result = await repo.FailWorkflow(
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
        Assert.Empty(Assert.Single(reloaded.Steps).ErrorHistory);
    }

    [Fact]
    public async Task FailWorkflow_WrongNamespace_IsNoOp()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();
        var workflow = await ParkWorkflow(repo, context, PersistentItemStatus.Requeued);

        var result = await repo.FailWorkflow(
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
        Assert.Equal(PersistentItemStatus.Requeued, reloaded.Status);
    }

    /// <summary>
    /// Synthesizes a parked workflow the way the handler leaves one: workflow and its single step in the
    /// same parked status, with a pending backoff on the workflow.
    /// </summary>
    private static async Task<Workflow> ParkWorkflow(
        IEngineRepository repo,
        EngineDbContext context,
        PersistentItemStatus parked
    )
    {
        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, parked);
        var backoffUntil = DateTimeOffset.UtcNow.AddMinutes(10);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET backoff_until = {backoffUntil} WHERE id = {workflow.DatabaseId}",
            TestContext.Current.CancellationToken
        );
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.steps SET status = {(int)parked} WHERE job_id = {workflow.DatabaseId}",
            TestContext.Current.CancellationToken
        );
        return workflow;
    }
}
