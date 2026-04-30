using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class WorkflowCollectionTests(PostgresFixture fixture) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    #region Helpers

    private static WorkflowRequest CreateWorkflowRequest(
        string? @ref = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        bool dependsOnHeads = true,
        bool? isHead = null
    ) =>
        new()
        {
            Ref = @ref,
            OperationId = $"op-{@ref ?? Guid.NewGuid().ToString("N")[..8]}",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "step",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
            DependsOn = dependsOn,
            DependsOnHeads = dependsOnHeads,
            IsHead = isHead,
        };

    private static async Task<BatchEnqueueResult[]> EnqueueWithCollection(
        EngineRepository repository,
        string collectionKey,
        IReadOnlyList<WorkflowRequest> workflows,
        string ns = "test-ns",
        string? idempotencyKey = null
    )
    {
        var request = new WorkflowEnqueueRequest { Workflows = workflows };

        var metadata = new WorkflowRequestMetadata(
            ns,
            idempotencyKey ?? Guid.NewGuid().ToString("N"),
            collectionKey,
            DateTimeOffset.UtcNow,
            null
        );
        var buffered = new BufferedEnqueueRequest(
            request,
            metadata,
            Guid.NewGuid().ToByteArray(),
            new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

        return await repository.BatchEnqueueWorkflows([buffered], TestContext.Current.CancellationToken);
    }

    #endregion

    [Fact]
    public async Task Enqueue_WithCollectionKey_CreatesCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var wf = CreateWorkflowRequest("a");

        // Act
        await EnqueueWithCollection(repo, "my-collection", [wf]);

        // Assert
        var collections = await repo.GetCollections("test-ns", TestContext.Current.CancellationToken);
        var collection = Assert.Single(collections);
        Assert.Equal("my-collection", collection.Key);
        Assert.Single(collection.Heads);
    }

    [Fact]
    public async Task Enqueue_WithoutCollectionKey_DoesNotCreateCollection()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var (request, metadata, ns, labels) = WorkflowTestHelper.CreateRequest();

        // Act
        await using var context = fixture.CreateDbContext();
        await WorkflowTestHelper.EnqueueWorkflow(repo, context, request, metadata, ns: ns, labels: labels);

        // Assert
        var collections = await repo.GetCollections(ns, TestContext.Current.CancellationToken);
        Assert.Empty(collections);
    }

    [Fact]
    public async Task Enqueue_SecondBatch_RootsDependOnPreviousHeads()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var wf1 = CreateWorkflowRequest("a");

        var results1 = await EnqueueWithCollection(repo, "chain", [wf1]);
        var headId = results1[0].WorkflowIds![0];

        // Act — enqueue a second batch; root workflow should auto-depend on head
        var wf2 = CreateWorkflowRequest("b");
        var results2 = await EnqueueWithCollection(repo, "chain", [wf2]);
        var newWfId = results2[0].WorkflowIds![0];

        // Assert — verify the new workflow has a dependency on the first head
        await using var context = fixture.CreateDbContext();
        var entity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == newWfId, TestContext.Current.CancellationToken);

        Assert.NotNull(entity.Dependencies);
        Assert.Contains(entity.Dependencies, d => d.Id == headId);

        // Also verify heads updated to point to the new workflow
        var collection = await repo.GetCollection("chain", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(newWfId, collection.Heads[0].DatabaseId);
    }

    [Fact]
    public async Task Enqueue_DependsOnHeadsFalse_DoesNotInjectDependencies_PreservesHeads()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var wf1 = CreateWorkflowRequest("a");
        var results1 = await EnqueueWithCollection(repo, "opt-out", [wf1]);
        var headId = results1[0].WorkflowIds![0];

        // Act — enqueue with DependsOnHeads = false
        var wf2 = CreateWorkflowRequest("b", dependsOnHeads: false);
        var results2 = await EnqueueWithCollection(repo, "opt-out", [wf2]);
        var newWfId = results2[0].WorkflowIds![0];

        // Assert — no dependencies on the new workflow
        await using var context = fixture.CreateDbContext();
        var entity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == newWfId, TestContext.Current.CancellationToken);

        Assert.NotNull(entity.Dependencies);
        Assert.Empty(entity.Dependencies);

        // Assert — both the original head and the new workflow are heads
        var collection = await repo.GetCollection("opt-out", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Equal(2, collection.Heads.Count);
        Assert.Contains(collection.Heads, h => h.DatabaseId == headId);
        Assert.Contains(collection.Heads, h => h.DatabaseId == newWfId);
    }

    [Fact]
    public async Task Enqueue_ExplicitDepOnHead_ConsumesOnlyThatHead()
    {
        // Arrange — create a collection with two heads (two independent workflows)
        var repo = fixture.CreateRepository();
        var wfA = CreateWorkflowRequest("a");
        var wfB = CreateWorkflowRequest("b");
        var results1 = await EnqueueWithCollection(repo, "partial-consume", [wfA, wfB]);
        var idA = results1[0].WorkflowIds![0];
        var idB = results1[0].WorkflowIds![1];

        // Act — enqueue a workflow that explicitly depends on A by DB ID, opts out of head deps
        var wfC = CreateWorkflowRequest("c", dependsOn: [WorkflowRef.FromDatabaseId(idA)], dependsOnHeads: false);
        var results2 = await EnqueueWithCollection(repo, "partial-consume", [wfC]);
        var idC = results2[0].WorkflowIds![0];

        // Assert — C has dependency on A
        await using var context = fixture.CreateDbContext();
        var entityC = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == idC, TestContext.Current.CancellationToken);

        Assert.NotNull(entityC.Dependencies);
        Assert.Contains(entityC.Dependencies, d => d.Id == idA);

        // Assert — heads: A consumed, B retained, C added
        var collection = await repo.GetCollection("partial-consume", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Equal(2, collection.Heads.Count);
        Assert.Contains(collection.Heads, h => h.DatabaseId == idB);
        Assert.Contains(collection.Heads, h => h.DatabaseId == idC);
        Assert.DoesNotContain(collection.Heads, h => h.DatabaseId == idA);
    }

    [Fact]
    public async Task Enqueue_ExplicitDepOnHead_WithDependsOnHeadsTrue_DoesNotDuplicateDependency()
    {
        // Arrange — create a collection with two heads (two independent workflows)
        var repo = fixture.CreateRepository();
        var wfA = CreateWorkflowRequest("a");
        var wfB = CreateWorkflowRequest("b");
        var results1 = await EnqueueWithCollection(repo, "partial-consume-default", [wfA, wfB]);
        var idA = results1[0].WorkflowIds![0];
        var idB = results1[0].WorkflowIds![1];

        // Act — enqueue a workflow that explicitly depends on A by DB ID and keeps default head deps
        var wfC = CreateWorkflowRequest("c", dependsOn: [WorkflowRef.FromDatabaseId(idA)]);
        var results2 = await EnqueueWithCollection(repo, "partial-consume-default", [wfC]);
        var idC = results2[0].WorkflowIds![0];

        // Assert — C depends on A explicitly and B via head injection, without a duplicate edge to A
        await using var context = fixture.CreateDbContext();
        var entityC = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == idC, TestContext.Current.CancellationToken);

        Assert.NotNull(entityC.Dependencies);
        Assert.Equal(2, entityC.Dependencies.Count);
        Assert.Contains(entityC.Dependencies, d => d.Id == idA);
        Assert.Contains(entityC.Dependencies, d => d.Id == idB);

        // Assert — both previous heads were consumed, so only C remains head
        var collection = await repo.GetCollection(
            "partial-consume-default",
            "test-ns",
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(idC, collection.Heads[0].DatabaseId);
    }

    [Fact]
    public async Task Enqueue_DAGInBatch_OnlyLeafBecomesHead()
    {
        // Arrange: A -> B within the batch; only B should be head
        var repo = fixture.CreateRepository();
        var wfA = CreateWorkflowRequest("a");
        var wfB = CreateWorkflowRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]);

        // Act
        var results = await EnqueueWithCollection(repo, "dag-batch", [wfA, wfB]);
        var idB = results[0].WorkflowIds![1]; // sorted order: a, b

        // Assert
        var collection = await repo.GetCollection("dag-batch", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(idB, collection.Heads[0].DatabaseId);
    }

    [Fact]
    public async Task Enqueue_IsHeadOverride_IncludesNonLeafInHeads()
    {
        // Arrange: A -> B, but A has IsHead = true
        var repo = fixture.CreateRepository();
        var wfA = CreateWorkflowRequest("a", isHead: true);
        var wfB = CreateWorkflowRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]);

        // Act
        var results = await EnqueueWithCollection(repo, "head-override", [wfA, wfB]);
        var idA = results[0].WorkflowIds![0];
        var idB = results[0].WorkflowIds![1];

        // Assert — both A (explicit) and B (leaf) are heads
        var collection = await repo.GetCollection("head-override", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Equal(2, collection.Heads.Count);
        Assert.Contains(collection.Heads, h => h.DatabaseId == idA);
        Assert.Contains(collection.Heads, h => h.DatabaseId == idB);
    }

    [Fact]
    public async Task GetCollection_ReturnsNull_WhenNotFound()
    {
        // Arrange
        var repo = fixture.CreateRepository();

        // Act
        var result = await repo.GetCollection("no-such-key", "test-ns", TestContext.Current.CancellationToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCollection_ReturnsHeadStatuses()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var wf = CreateWorkflowRequest("a");
        await EnqueueWithCollection(repo, "status-check", [wf]);

        // Act
        var collection = await repo.GetCollection("status-check", "test-ns", TestContext.Current.CancellationToken);

        // Assert
        Assert.NotNull(collection);
        var head = Assert.Single(collection.Heads);
        Assert.Equal(PersistentItemStatus.Enqueued, head.Status);
    }

    [Fact]
    public async Task GetCollections_ReturnsAllInNamespace()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        await EnqueueWithCollection(repo, "col-1", [CreateWorkflowRequest("a")]);
        await EnqueueWithCollection(repo, "col-2", [CreateWorkflowRequest("b")]);

        // Act
        var collections = await repo.GetCollections("test-ns", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(2, collections.Count);
        Assert.Contains(collections, c => c.Key == "col-1");
        Assert.Contains(collections, c => c.Key == "col-2");
    }

    [Fact]
    public async Task GetCollections_IsolatedByNamespace()
    {
        // Arrange — create collections in different namespaces
        var repo = fixture.CreateRepository();
        await EnqueueWithCollection(repo, "shared-key", [CreateWorkflowRequest("a")], ns: "ns-1");
        await EnqueueWithCollection(repo, "shared-key", [CreateWorkflowRequest("b")], ns: "ns-2");

        // Act
        var ns1Collections = await repo.GetCollections("ns-1", TestContext.Current.CancellationToken);
        var ns2Collections = await repo.GetCollections("ns-2", TestContext.Current.CancellationToken);

        // Assert — each namespace sees only its own collection
        Assert.Single(ns1Collections);
        Assert.Single(ns2Collections);
    }

    [Fact]
    public async Task Enqueue_ThreeBatches_HeadsUpdateEachTime()
    {
        // Arrange
        var repo = fixture.CreateRepository();

        // Batch 1: single workflow
        var results1 = await EnqueueWithCollection(repo, "multi", [CreateWorkflowRequest("a")]);
        var idA = results1[0].WorkflowIds![0];

        // Batch 2: depends on batch 1's head
        var results2 = await EnqueueWithCollection(repo, "multi", [CreateWorkflowRequest("b")]);
        var idB = results2[0].WorkflowIds![0];

        // Act — Batch 3: depends on batch 2's head
        var results3 = await EnqueueWithCollection(repo, "multi", [CreateWorkflowRequest("c")]);
        var idC = results3[0].WorkflowIds![0];

        // Assert — heads should be [C], and C should depend on B, B should depend on A
        var collection = await repo.GetCollection("multi", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(idC, collection.Heads[0].DatabaseId);

        // Verify dependency chain: C -> B -> A
        await using var context = fixture.CreateDbContext();
        var entityC = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == idC, TestContext.Current.CancellationToken);
        Assert.NotNull(entityC.Dependencies);
        Assert.Contains(entityC.Dependencies, d => d.Id == idB);

        var entityB = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == idB, TestContext.Current.CancellationToken);
        Assert.NotNull(entityB.Dependencies);
        Assert.Contains(entityB.Dependencies, d => d.Id == idA);
    }

    [Fact]
    public async Task Enqueue_ConcurrentFirstWrites_SerializesNewCollectionRow()
    {
        // Arrange
        var repo1 = fixture.CreateRepository();
        var repo2 = fixture.CreateRepository();

        var enqueue1 = EnqueueWithCollection(repo1, "concurrent-first", [CreateWorkflowRequest("a")]);
        var enqueue2 = EnqueueWithCollection(repo2, "concurrent-first", [CreateWorkflowRequest("b")]);

        // Act
        var results = await Task.WhenAll(enqueue1, enqueue2);
        var idA = results[0][0].WorkflowIds![0];
        var idB = results[1][0].WorkflowIds![0];

        // Assert — the final collection should have exactly one head, and that head should depend on
        // the other workflow. Without seeding before FOR UPDATE, both transactions can compute from
        // empty heads and race, so the winner would have no dependency.
        var repo = fixture.CreateRepository();
        var collection = await repo.GetCollection("concurrent-first", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        var head = Assert.Single(collection.Heads);

        var nonHeadId = head.DatabaseId == idA ? idB : idA;

        await using var context = fixture.CreateDbContext();
        var headEntity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == head.DatabaseId, TestContext.Current.CancellationToken);

        Assert.NotNull(headEntity.Dependencies);
        Assert.Contains(headEntity.Dependencies, d => d.Id == nonHeadId);
    }

    [Fact]
    public async Task Enqueue_IsHeadFalse_SideChain_HeadsUnchanged_DependencyCreated()
    {
        // Arrange — create a collection with one head
        var repo = fixture.CreateRepository();
        var wf1 = CreateWorkflowRequest("main");
        var results1 = await EnqueueWithCollection(repo, "side-chain", [wf1]);
        var headId = results1[0].WorkflowIds![0];

        // Act — enqueue a side-chain workflow: depends on head, but invisible to collection
        var sideWf = CreateWorkflowRequest("side", dependsOnHeads: true, isHead: false);
        var results2 = await EnqueueWithCollection(repo, "side-chain", [sideWf]);
        var sideId = results2[0].WorkflowIds![0];

        // Assert — heads unchanged: only original head remains
        var collection = await repo.GetCollection("side-chain", "test-ns", TestContext.Current.CancellationToken);
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(headId, collection.Heads[0].DatabaseId);

        // Assert — dependency edge was still created for execution ordering
        await using var context = fixture.CreateDbContext();
        var sideEntity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == sideId, TestContext.Current.CancellationToken);
        Assert.NotNull(sideEntity.Dependencies);
        Assert.Contains(sideEntity.Dependencies, d => d.Id == headId);
    }

    [Fact]
    public async Task Enqueue_InvisibleSideChainByRef_DoesNotPreventVisibleParentFromBecomingHead()
    {
        // Arrange
        var repo = fixture.CreateRepository();
        var main = CreateWorkflowRequest("main");
        var side = CreateWorkflowRequest("side", dependsOn: [WorkflowRef.FromRefString("main")], isHead: false);

        // Act
        var results = await EnqueueWithCollection(repo, "invisible-ref-side-chain", [main, side]);
        var mainId = results[0].WorkflowIds![0];
        var sideId = results[0].WorkflowIds![1];

        // Assert — only the visible workflow becomes the collection head
        var collection = await repo.GetCollection(
            "invisible-ref-side-chain",
            "test-ns",
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(mainId, collection.Heads[0].DatabaseId);

        // Assert — execution ordering still includes the side-chain dependency
        await using var context = fixture.CreateDbContext();
        var sideEntity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == sideId, TestContext.Current.CancellationToken);
        Assert.NotNull(sideEntity.Dependencies);
        Assert.Contains(sideEntity.Dependencies, d => d.Id == mainId);
    }

    [Fact]
    public async Task Enqueue_IsHeadFalse_NextBatch_StillDependsOnOriginalHeads()
    {
        // Arrange — create a collection, enqueue invisible side-chain, then enqueue a third batch
        var repo = fixture.CreateRepository();

        // Batch 1: main workflow → becomes head
        var results1 = await EnqueueWithCollection(repo, "side-then-continue", [CreateWorkflowRequest("main")]);
        var mainId = results1[0].WorkflowIds![0];

        // Batch 2: invisible side-chain — heads should be unchanged
        var sideWf = CreateWorkflowRequest("side", dependsOnHeads: true, isHead: false);
        await EnqueueWithCollection(repo, "side-then-continue", [sideWf]);

        // Act — Batch 3: normal workflow, should depend on original head (main), not side
        var results3 = await EnqueueWithCollection(repo, "side-then-continue", [CreateWorkflowRequest("next")]);
        var nextId = results3[0].WorkflowIds![0];

        // Assert — heads updated to [next], main was consumed
        var collection = await repo.GetCollection(
            "side-then-continue",
            "test-ns",
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(collection);
        Assert.Single(collection.Heads);
        Assert.Equal(nextId, collection.Heads[0].DatabaseId);

        // Assert — next depends on main (the head), not on side
        await using var context = fixture.CreateDbContext();
        var nextEntity = await context
            .Workflows.Include(w => w.Dependencies)
            .SingleAsync(w => w.Id == nextId, TestContext.Current.CancellationToken);
        Assert.NotNull(nextEntity.Dependencies);
        Assert.Contains(nextEntity.Dependencies, d => d.Id == mainId);
    }
}
