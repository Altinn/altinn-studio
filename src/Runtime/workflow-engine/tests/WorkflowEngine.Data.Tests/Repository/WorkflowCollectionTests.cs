using WorkflowEngine.Data.Entities;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Repository;

public class WorkflowCollectionTests
{
    private static Workflow CreateWorkflow(Guid id) =>
        new WorkflowEntity
        {
            Id = id,
            OperationId = "op",
            IdempotencyKey = $"key-{id}",
            Namespace = "test",
            Status = PersistentItemStatus.Enqueued,
            Steps = [],
            CreatedAt = DateTimeOffset.UtcNow,
        }.ToDomainModel();

    private static WorkflowRequest CreateRequest(
        string? @ref = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        bool dependsOnHeads = true,
        bool? isHead = null
    ) =>
        new()
        {
            Ref = @ref,
            OperationId = $"op-{@ref ?? Guid.NewGuid().ToString("N")[..8]}",
            Steps = [new StepRequest { Command = CommandDefinition.Create("webhook"), OperationId = "s1" }],
            DependsOn = dependsOn,
            DependsOnHeads = dependsOnHeads,
            IsHead = isHead,
        };

    #region ComputeNewHeads

    [Fact]
    public void ComputeNewHeads_SingleWorkflow_NoRefs_IsLeafHead()
    {
        // Arrange
        var id = Guid.NewGuid();
        var requests = new[] { CreateRequest() };
        var workflows = new[] { CreateWorkflow(id) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(id, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_TwoIndependent_BothAreHeads()
    {
        // Arrange
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var requests = new[] { CreateRequest("a"), CreateRequest("b") };
        var workflows = new[] { CreateWorkflow(id1), CreateWorkflow(id2) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Equal(2, heads.Length);
        Assert.Contains(id1, heads);
        Assert.Contains(id2, heads);
    }

    [Fact]
    public void ComputeNewHeads_Chain_OnlyLeafIsHead()
    {
        // Arrange: A -> B (B depends on A, so A is depended-on, B is the leaf)
        var idA = Guid.NewGuid();
        var idB = Guid.NewGuid();
        var requests = new[] { CreateRequest("a"), CreateRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]) };
        var workflows = new[] { CreateWorkflow(idA), CreateWorkflow(idB) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(idB, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_InvisibleSideChainByRef_DoesNotBlockVisibleParentFromBecomingHead()
    {
        // Arrange: main -> invisible side, so main should still be treated as the visible leaf/head.
        var mainId = Guid.NewGuid();
        var sideId = Guid.NewGuid();
        var requests = new[]
        {
            CreateRequest("main"),
            CreateRequest("side", dependsOn: [WorkflowRef.FromRefString("main")], isHead: false),
        };
        var workflows = new[] { CreateWorkflow(mainId), CreateWorkflow(sideId) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(mainId, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_Diamond_OnlyLeafIsHead()
    {
        // Arrange: A -> B, A -> C, B -> D, C -> D (diamond: only D is leaf)
        var idA = Guid.NewGuid();
        var idB = Guid.NewGuid();
        var idC = Guid.NewGuid();
        var idD = Guid.NewGuid();
        var requests = new[]
        {
            CreateRequest("a"),
            CreateRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]),
            CreateRequest("c", dependsOn: [WorkflowRef.FromRefString("a")]),
            CreateRequest("d", dependsOn: [WorkflowRef.FromRefString("b"), WorkflowRef.FromRefString("c")]),
        };
        var workflows = new[] { CreateWorkflow(idA), CreateWorkflow(idB), CreateWorkflow(idC), CreateWorkflow(idD) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(idD, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_IsHeadOverride_IncludesNonLeaf()
    {
        // Arrange: A -> B, but A has IsHead = true
        var idA = Guid.NewGuid();
        var idB = Guid.NewGuid();
        var requests = new[]
        {
            CreateRequest("a", isHead: true),
            CreateRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]),
        };
        var workflows = new[] { CreateWorkflow(idA), CreateWorkflow(idB) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Equal(2, heads.Length);
        Assert.Contains(idA, heads);
        Assert.Contains(idB, heads);
    }

    [Fact]
    public void ComputeNewHeads_ExternalDependency_DoesNotAffectLeafDetection()
    {
        // Arrange: A depends on an external DB ID — not an intra-batch ref, so A is still a leaf
        var idA = Guid.NewGuid();
        var externalId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOn: [WorkflowRef.FromDatabaseId(externalId)]) };
        var workflows = new[] { CreateWorkflow(idA) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(idA, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_NoRefWorkflow_IsLeaf()
    {
        // Arrange: workflow with no ref at all — can't be depended on, so always a leaf
        var id = Guid.NewGuid();
        var requests = new[] { CreateRequest(null) };
        var workflows = new[] { CreateWorkflow(id) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert
        Assert.Single(heads);
        Assert.Equal(id, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_DependsOnHeadsFalse_PreservesExistingHeads()
    {
        // Arrange: existing heads [H1, H2], new workflow opts out of head deps
        var h1 = Guid.NewGuid();
        var h2 = Guid.NewGuid();
        var newId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOnHeads: false) };
        var workflows = new[] { CreateWorkflow(newId) };
        Guid[] currentHeads = [h1, h2];

        // Act — no head dep edges since DependsOnHeads = false
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, []);

        // Assert — all previous heads preserved, new workflow appended
        Assert.Equal(3, heads.Length);
        Assert.Contains(h1, heads);
        Assert.Contains(h2, heads);
        Assert.Contains(newId, heads);
    }

    [Fact]
    public void ComputeNewHeads_ExplicitDepOnOneHead_ConsumesOnlyThatHead()
    {
        // Arrange: existing heads [H1, H2], workflow explicitly depends on H1 by DB ID
        var h1 = Guid.NewGuid();
        var h2 = Guid.NewGuid();
        var newId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOn: [WorkflowRef.FromDatabaseId(h1)], dependsOnHeads: false) };
        var workflows = new[] { CreateWorkflow(newId) };
        Guid[] currentHeads = [h1, h2];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, []);

        // Assert — H1 consumed, H2 retained, new workflow added
        Assert.Equal(2, heads.Length);
        Assert.Contains(h2, heads);
        Assert.Contains(newId, heads);
        Assert.DoesNotContain(h1, heads);
    }

    [Fact]
    public void ComputeNewHeads_DependsOnHeadsTrue_ConsumesAllHeads()
    {
        // Arrange: existing heads [H1, H2], root workflow with DependsOnHeads = true
        var h1 = Guid.NewGuid();
        var h2 = Guid.NewGuid();
        var newId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a") };
        var workflows = new[] { CreateWorkflow(newId) };
        Guid[] currentHeads = [h1, h2];

        // Simulate injected head dep edges (what ComputeHeadDependencyEdges would produce)
        List<(Guid, Guid)> headEdges = [(newId, h1), (newId, h2)];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, headEdges);

        // Assert — all previous heads consumed, only new workflow remains
        Assert.Single(heads);
        Assert.Equal(newId, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_ChainInBatch_ConsumesHeadsViaTransitiveDep()
    {
        // Arrange: existing head [H1], batch has A -> B, both DependsOnHeads = true.
        // A is a root so gets head dep edge to H1. B depends on A (intra-batch).
        // Only B is a leaf. H1 is consumed via A's injected edge.
        var h1 = Guid.NewGuid();
        var idA = Guid.NewGuid();
        var idB = Guid.NewGuid();
        var requests = new[] { CreateRequest("a"), CreateRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]) };
        var workflows = new[] { CreateWorkflow(idA), CreateWorkflow(idB) };
        Guid[] currentHeads = [h1];
        List<(Guid, Guid)> headEdges = [(idA, h1)];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, headEdges);

        // Assert — H1 consumed, only B is head (A is not a leaf)
        Assert.Single(heads);
        Assert.Equal(idB, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_IsHeadFalse_ExcludesNaturalLeaf()
    {
        // Arrange: single leaf workflow with IsHead = false, existing heads [H1]
        var h1 = Guid.NewGuid();
        var newId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOnHeads: true, isHead: false) };
        var workflows = new[] { CreateWorkflow(newId) };
        Guid[] currentHeads = [h1];

        // Head dep edges would still be injected (DependsOnHeads=true), but invisible workflow
        List<(Guid, Guid)> headEdges = [(newId, h1)];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, headEdges);

        // Assert — newId is invisible: not added to heads, and its edges don't consume H1
        Assert.Single(heads);
        Assert.Equal(h1, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_IsHeadFalse_DoesNotConsumeHeadsViaExplicitDep()
    {
        // Arrange: workflow explicitly depends on H1 by DB ID, but IsHead = false
        var h1 = Guid.NewGuid();
        var newId = Guid.NewGuid();
        var requests = new[]
        {
            CreateRequest("a", dependsOn: [WorkflowRef.FromDatabaseId(h1)], dependsOnHeads: false, isHead: false),
        };
        var workflows = new[] { CreateWorkflow(newId) };
        Guid[] currentHeads = [h1];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, []);

        // Assert — invisible workflow: H1 not consumed, newId not added
        Assert.Single(heads);
        Assert.Equal(h1, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_IsHeadFalse_SideChain_HeadsUnchanged()
    {
        // Arrange: the motivating use case — side chain depends on heads but is invisible
        var h1 = Guid.NewGuid();
        var h2 = Guid.NewGuid();
        var sideId = Guid.NewGuid();
        var requests = new[] { CreateRequest("side", dependsOnHeads: true, isHead: false) };
        var workflows = new[] { CreateWorkflow(sideId) };
        Guid[] currentHeads = [h1, h2];

        // DependsOnHeads=true would inject edges, but invisible workflow doesn't consume
        List<(Guid, Guid)> headEdges = [(sideId, h1), (sideId, h2)];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, headEdges);

        // Assert — heads completely unchanged
        Assert.Equal(2, heads.Length);
        Assert.Contains(h1, heads);
        Assert.Contains(h2, heads);
    }

    [Fact]
    public void ComputeNewHeads_MixedBatch_OnlyVisibleWorkflowsConsumeHeads()
    {
        // Arrange: batch has visible workflow V and invisible workflow I, both depend on head H1
        var h1 = Guid.NewGuid();
        var visibleId = Guid.NewGuid();
        var invisibleId = Guid.NewGuid();
        var requests = new[]
        {
            CreateRequest("v"), // IsHead = null (default), DependsOnHeads = true
            CreateRequest("i", dependsOnHeads: true, isHead: false), // invisible
        };
        var workflows = new[] { CreateWorkflow(visibleId), CreateWorkflow(invisibleId) };
        Guid[] currentHeads = [h1];

        // Both get head dep edges injected
        List<(Guid, Guid)> headEdges = [(visibleId, h1), (invisibleId, h1)];

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, currentHeads, headEdges);

        // Assert — H1 consumed by visible workflow, invisible excluded from heads
        Assert.Single(heads);
        Assert.Equal(visibleId, heads[0]);
    }

    [Fact]
    public void ComputeNewHeads_IsHeadFalse_NoCurrentHeads_ExcludedFromLeaves()
    {
        // Arrange: no existing heads, single workflow with IsHead = false
        var newId = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", isHead: false) };
        var workflows = new[] { CreateWorkflow(newId) };

        // Act
        var heads = EngineRepository.ComputeNewHeads(requests, workflows, [], []);

        // Assert — force-excluded even when there are no current heads
        Assert.Empty(heads);
    }

    #endregion

    #region ComputeHeadDependencyEdges

    [Fact]
    public void ComputeHeadDependencyEdges_NoCurrentHeads_ReturnsEmpty()
    {
        // Arrange
        var id = Guid.NewGuid();
        var requests = new[] { CreateRequest() };
        var workflows = new[] { CreateWorkflow(id) };
        Guid[] currentHeads = [];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert
        Assert.Empty(edges);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_RootWorkflow_GetsDependenciesOnHeads()
    {
        // Arrange
        var wfId = Guid.NewGuid();
        var head1 = Guid.NewGuid();
        var head2 = Guid.NewGuid();
        var requests = new[] { CreateRequest("a") };
        var workflows = new[] { CreateWorkflow(wfId) };
        Guid[] currentHeads = [head1, head2];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert
        Assert.Equal(2, edges.Count);
        Assert.Contains((wfId, head1), edges);
        Assert.Contains((wfId, head2), edges);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_NonRootWorkflow_Skipped()
    {
        // Arrange: workflow B depends on A (intra-batch ref), so B is not a root
        var idA = Guid.NewGuid();
        var idB = Guid.NewGuid();
        var head = Guid.NewGuid();
        var requests = new[] { CreateRequest("a"), CreateRequest("b", dependsOn: [WorkflowRef.FromRefString("a")]) };
        var workflows = new[] { CreateWorkflow(idA), CreateWorkflow(idB) };
        Guid[] currentHeads = [head];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert — only A (the root) gets head deps, not B
        Assert.Single(edges);
        Assert.Equal((idA, head), edges[0]);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_DependsOnHeadsFalse_Skipped()
    {
        // Arrange: root workflow but DependsOnHeads = false
        var wfId = Guid.NewGuid();
        var head = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOnHeads: false) };
        var workflows = new[] { CreateWorkflow(wfId) };
        Guid[] currentHeads = [head];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert
        Assert.Empty(edges);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_ExternalDependency_StillTreatedAsRoot()
    {
        // Arrange: workflow depends on an external DB ID only — no intra-batch refs → still a root
        var wfId = Guid.NewGuid();
        var externalId = Guid.NewGuid();
        var head = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOn: [WorkflowRef.FromDatabaseId(externalId)]) };
        var workflows = new[] { CreateWorkflow(wfId) };
        Guid[] currentHeads = [head];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert — external deps don't count as intra-batch, so still gets head deps
        Assert.Single(edges);
        Assert.Equal((wfId, head), edges[0]);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_ExplicitCurrentHeadDbId_SkipsDuplicateInjectedEdge()
    {
        // Arrange: explicit DB-ID dep on one current head should not also be injected via DependsOnHeads
        var wfId = Guid.NewGuid();
        var headA = Guid.NewGuid();
        var headB = Guid.NewGuid();
        var requests = new[] { CreateRequest("a", dependsOn: [WorkflowRef.FromDatabaseId(headA)]) };
        var workflows = new[] { CreateWorkflow(wfId) };
        Guid[] currentHeads = [headA, headB];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert — headA is already explicit, so only headB should be injected
        Assert.Single(edges);
        Assert.Equal((wfId, headB), edges[0]);
    }

    [Fact]
    public void ComputeHeadDependencyEdges_MultipleRoots_AllGetHeadDeps()
    {
        // Arrange: two root workflows, one head
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var head = Guid.NewGuid();
        var requests = new[] { CreateRequest("a"), CreateRequest("b") };
        var workflows = new[] { CreateWorkflow(id1), CreateWorkflow(id2) };
        Guid[] currentHeads = [head];

        // Act
        var edges = EngineRepository.ComputeHeadDependencyEdges(requests, workflows, currentHeads);

        // Assert
        Assert.Equal(2, edges.Count);
        Assert.Contains((id1, head), edges);
        Assert.Contains((id2, head), edges);
    }

    #endregion
}
