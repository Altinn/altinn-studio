using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Persistence of <c>resumed_at</c>. Resume reruns a workflow in place and keeps its creation time,
/// so the resume time is what consumers time the current run from.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ResumedAtPersistenceTests(PostgresFixture fixture) : IAsyncLifetime
{
    private static readonly DateTimeOffset _resumedAt = new(2026, 9, 24, 12, 0, 0, TimeSpan.Zero);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task Enqueue_LeavesResumedAtNull()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        var workflow = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Enqueued);

        Assert.Null(await GetResumedAt(context, workflow.DatabaseId));
    }

    [Fact]
    public async Task ResumeWorkflow_StampsTheResumedWorkflowAndCascadedDependents_KeepsCreatedAt()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        const string ns = "resumed-at";
        var primary = await WorkflowTestHelper.InsertAndSetStatus(repo, context, PersistentItemStatus.Failed, ns: ns);
        var dependent = await WorkflowTestHelper.InsertAndSetStatus(
            repo,
            context,
            PersistentItemStatus.DependencyFailed,
            ns: ns,
            dependencies: [primary.DatabaseId]
        );
        var createdAt = (await fixture.GetWorkflow(primary.DatabaseId))?.CreatedAt;

        var resumed = await repo.ResumeWorkflow(
            primary.DatabaseId,
            primary.Namespace,
            _resumedAt,
            cascade: true,
            TestContext.Current.CancellationToken
        );
        Assert.Contains(primary.DatabaseId, resumed);
        Assert.Contains(dependent.DatabaseId, resumed);

        Assert.Equal(_resumedAt, await GetResumedAt(context, primary.DatabaseId));
        Assert.Equal(_resumedAt, await GetResumedAt(context, dependent.DatabaseId));
        Assert.Equal(createdAt, (await fixture.GetWorkflow(primary.DatabaseId))?.CreatedAt);
    }

    private static Task<DateTimeOffset?> GetResumedAt(EngineDbContext context, Guid workflowId) =>
        context
            .Workflows.AsNoTracking()
            .Where(w => w.Id == workflowId)
            .Select(w => w.ResumedAt)
            .SingleAsync(TestContext.Current.CancellationToken);
}
