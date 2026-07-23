using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class DependencyGraphTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task GetWorkflowDependencyGraph_LimitKeepsNewestNodes()
    {
        await using var context = fixture.CreateDbContext();
        var repo = fixture.CreateRepository();

        // a ← b ← c, enqueued as three separate batches so creation order is distinct.
        var (requestA, metadataA, ns, labels) = WorkflowTestHelper.CreateRequest();
        var a = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestA, metadataA, ns: ns, labels: labels);
        var (requestB, metadataB, _, _) = WorkflowTestHelper.CreateRequest(ns: ns, dependencies: [a.DatabaseId]);
        var b = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestB, metadataB, ns: ns, labels: labels);
        var (requestC, metadataC, _, _) = WorkflowTestHelper.CreateRequest(ns: ns, dependencies: [b.DatabaseId]);
        var c = await WorkflowTestHelper.EnqueueWorkflow(repo, context, requestC, metadataC, ns: ns, labels: labels);

        // Unlimited: the whole component, queried from the oldest node.
        var full = await repo.GetWorkflowDependencyGraph(
            a.DatabaseId,
            ns,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.NotNull(full);
        Assert.Equal(3, full.Count);

        // Limited: only the most recently created nodes survive — the (older) root the
        // component was queried from is trimmed, but the lookup itself still succeeds.
        var limited = await repo.GetWorkflowDependencyGraph(
            a.DatabaseId,
            ns,
            limit: 2,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(limited);
        Assert.Equal([b.DatabaseId, c.DatabaseId], limited.Select(w => w.DatabaseId).ToArray());

        // A missing root is still a miss, not an empty capped result.
        var missing = await repo.GetWorkflowDependencyGraph(
            Guid.NewGuid(),
            ns,
            limit: 2,
            TestContext.Current.CancellationToken
        );
        Assert.Null(missing);
    }
}
