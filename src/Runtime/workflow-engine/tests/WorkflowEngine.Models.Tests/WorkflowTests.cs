namespace WorkflowEngine.Models.Tests;

public class WorkflowTests
{
    private static string _randomNamespace => Guid.NewGuid().ToString();

    [Fact]
    public void Equality_Uses_DatabaseId()
    {
        // Arrange

        var sharedGuid = Guid.NewGuid();

        var sharedId1 = new Workflow
        {
            DatabaseId = sharedGuid,
            CorrelationId = Guid.NewGuid(),
            OperationId = "workflow-1-operation",
            IdempotencyKey = "key-1",
            Namespace = _randomNamespace,
            Steps = [],
        };
        var sharedId2 = new Workflow
        {
            DatabaseId = sharedGuid,
            CorrelationId = Guid.NewGuid(),
            OperationId = "workflow-2-operation",
            IdempotencyKey = "key-2",
            Namespace = _randomNamespace,
            Steps = [],
        };
        var uniqueId = new Workflow
        {
            DatabaseId = Guid.NewGuid(),
            CorrelationId = Guid.NewGuid(),
            OperationId = "workflow-3-operation",
            IdempotencyKey = "key-3",
            Namespace = _randomNamespace,
            Steps = [],
        };

        // Act
        bool shouldBeEqual1 = sharedId1 == sharedId2;
        bool shouldBeEqual2 = sharedId1.Equals(sharedId2);

        bool shouldNotBeEqual1 = uniqueId == sharedId1;
        bool shouldNotBeEqual2 = uniqueId.Equals(sharedId1);

        bool shouldContain = new[] { sharedId1, uniqueId }.Contains(sharedId2);

        // Assert
        Assert.True(shouldBeEqual1);
        Assert.True(shouldBeEqual2);

        Assert.False(shouldNotBeEqual1);
        Assert.False(shouldNotBeEqual2);

        Assert.True(shouldContain);
    }

    [Fact]
    public void Workflow_ConstructsWithAllFields()
    {
        // Arrange
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(10);
        var traceContext = "trace-context-123";

        var steps = new List<Step>
        {
            new()
            {
                OperationId = "step-1",
                IdempotencyKey = "step-key-1",
                ProcessingOrder = 0,
                Command = new CommandDefinition { Type = "app" },
                CreatedAt = createdAt,
            },
            new()
            {
                OperationId = "step-2",
                IdempotencyKey = "step-key-2",
                ProcessingOrder = 1,
                Command = new CommandDefinition { Type = "app" },
                CreatedAt = createdAt,
            },
        };

        // Act
        var workflow = new Workflow
        {
            OperationId = "next",
            IdempotencyKey = "wf-1-key",
            Namespace = "ns-1",
            Labels = new Dictionary<string, string> { ["org"] = "ttd", ["app"] = "test-app" },
            CreatedAt = createdAt,
            StartAt = startAt,
            DistributedTraceContext = traceContext,
            Status = PersistentItemStatus.Enqueued,
            Steps = steps,
        };

        // Assert — Workflow fields
        Assert.Equal("next", workflow.OperationId);
        Assert.Equal("ns-1", workflow.Namespace);
        Assert.Equal("ttd", workflow.Labels!["org"]);
        Assert.Equal(createdAt, workflow.CreatedAt);
        Assert.Equal(startAt, workflow.StartAt);
        Assert.Equal(traceContext, workflow.DistributedTraceContext);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);
        Assert.Null(workflow.Dependencies);
        Assert.Null(workflow.Links);

        // Assert — Steps are created with correct count and ordering
        Assert.Equal(2, workflow.Steps.Count);
        Assert.Equal(0, workflow.Steps[0].ProcessingOrder);
        Assert.Equal(1, workflow.Steps[1].ProcessingOrder);

        // Assert — Step fields
        Assert.Equal("step-1", workflow.Steps[0].OperationId);
        Assert.Equal("step-2", workflow.Steps[1].OperationId);
        Assert.Equal(createdAt, workflow.Steps[0].CreatedAt);
    }

    [Fact]
    public void Workflow_NullOptionalFields()
    {
        // Arrange & Act
        var workflow = new Workflow
        {
            OperationId = "op-1",
            IdempotencyKey = "wf-1-key",
            Namespace = "ns-1",
            Steps =
            [
                new Step
                {
                    OperationId = "noop",
                    IdempotencyKey = "step-key",
                    ProcessingOrder = 0,
                    Command = new CommandDefinition { Type = "noop" },
                },
            ],
        };

        // Assert
        Assert.Null(workflow.StartAt);
        Assert.Null(workflow.DistributedTraceContext);
        Assert.Null(workflow.Dependencies);
        Assert.Null(workflow.Links);
        Assert.Null(workflow.Labels);
        Assert.Null(workflow.Context);
    }

    [Fact]
    public void Workflow_WithDependenciesAndLinks()
    {
        // Arrange
        var depGuid = Guid.NewGuid();
        var linkGuid = Guid.NewGuid();

        var dependency = new Workflow
        {
            DatabaseId = depGuid,
            CorrelationId = Guid.NewGuid(),
            OperationId = "dep-op",
            IdempotencyKey = "dep-key",
            Namespace = _randomNamespace,
            Steps = [],
        };
        var link = new Workflow
        {
            DatabaseId = linkGuid,
            CorrelationId = Guid.NewGuid(),
            OperationId = "link-op",
            IdempotencyKey = "link-key",
            Namespace = _randomNamespace,
            Steps = [],
        };

        // Act
        var workflow = new Workflow
        {
            OperationId = "op-1",
            IdempotencyKey = "wf-1-key",
            Namespace = _randomNamespace,
            Steps =
            [
                new Step
                {
                    OperationId = "noop",
                    IdempotencyKey = "step-key",
                    ProcessingOrder = 0,
                    Command = new CommandDefinition { Type = "noop" },
                },
            ],
            Dependencies = [dependency],
            Links = [link],
        };

        // Assert
        Assert.NotNull(workflow.Dependencies);
        Assert.Single(workflow.Dependencies);
        Assert.Equal(depGuid, workflow.Dependencies.First().DatabaseId);

        Assert.NotNull(workflow.Links);
        Assert.Single(workflow.Links);
        Assert.Equal(linkGuid, workflow.Links.First().DatabaseId);
    }
}
