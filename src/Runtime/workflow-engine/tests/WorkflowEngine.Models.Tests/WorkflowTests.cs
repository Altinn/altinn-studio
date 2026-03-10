using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models.Tests;

public class WorkflowTests
{
    private static Actor _randomActor => new() { UserIdOrOrgNumber = Guid.NewGuid().ToString() };
    private static InstanceInformation _randomInstance =>
        new()
        {
            Org = Guid.NewGuid().ToString(),
            App = Guid.NewGuid().ToString(),
            InstanceOwnerPartyId = Guid.NewGuid().GetHashCode(),
            InstanceGuid = Guid.NewGuid(),
        };

    [Fact]
    public void Equality_Uses_DatabaseId()
    {
        // Arrange

        var sharedGuid = Guid.NewGuid();

        var sharedId1 = new Workflow
        {
            DatabaseId = sharedGuid,
            OperationId = "workflow-1-operation",
            IdempotencyKey = "key-1",
            Namespace = "default",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var sharedId2 = new Workflow
        {
            DatabaseId = sharedGuid,
            OperationId = "workflow-2-operation",
            IdempotencyKey = "key-2",
            Namespace = "default",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var uniqueId = new Workflow
        {
            DatabaseId = Guid.NewGuid(),
            OperationId = "workflow-3-operation",
            IdempotencyKey = "key-3",
            Namespace = "default",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
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
    public void FromRequest_MapsAllFieldsCorrectly()
    {
        // Arrange
        var actor = new Actor { UserIdOrOrgNumber = "user-1", Language = "nb" };
        var instanceInfo = new InstanceInformation
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.NewGuid(),
        };
        var retryStrategy = RetryStrategy.Exponential(baseInterval: TimeSpan.FromSeconds(1));
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(10);
        var traceContext = "trace-context-123";

        var workflowRequest = new WorkflowRequest
        {
            OperationId = "next",
            StartAt = startAt,
            Steps =
            [
                new StepRequest { Command = new Command.AppCommand("step-1") },
                new StepRequest { Command = new Command.AppCommand("step-2"), RetryStrategy = retryStrategy },
            ],
        };

        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: instanceInfo,
            Actor: actor,
            CreatedAt: createdAt,
            TraceContext: traceContext,
            InstanceLockKey: "lock-key-1",
            Namespace: "default"
        );

        // Act
        var workflow = Workflow.FromRequest(workflowRequest, metadata, "wf-1-key", dependencies: null, links: null);

        // Assert — Workflow fields
        Assert.Equal("next", workflow.OperationId);
        Assert.Same(instanceInfo, workflow.InstanceInformation);
        Assert.Same(actor, workflow.Actor);
        Assert.Equal(createdAt, workflow.CreatedAt);
        Assert.Equal(startAt, workflow.StartAt);
        Assert.Equal(traceContext, workflow.DistributedTraceContext);
        Assert.Equal("lock-key-1", workflow.InstanceLockKey);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);
        Assert.Null(workflow.Dependencies);
        Assert.Null(workflow.Links);

        // Assert — Steps are created with correct count and ordering
        Assert.Equal(2, workflow.Steps.Count);
        Assert.Equal(0, workflow.Steps[0].ProcessingOrder);
        Assert.Equal(1, workflow.Steps[1].ProcessingOrder);

        // Assert — Step fields are mapped from metadata
        Assert.Equal("step-1", workflow.Steps[0].OperationId);
        Assert.Equal("step-2", workflow.Steps[1].OperationId);
        Assert.Same(actor, workflow.Steps[0].Actor);
        Assert.Equal(createdAt, workflow.Steps[0].CreatedAt);
    }

    [Fact]
    public void FromRequest_MapsNullOptionalFields()
    {
        // Arrange
        var workflowRequest = new WorkflowRequest
        {
            OperationId = "op-1",
            Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
        };

        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: new Actor { UserIdOrOrgNumber = "user-1" },
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null,
            Namespace: "default"
        );

        // Act
        var workflow = Workflow.FromRequest(workflowRequest, metadata, "wf-1-key", dependencies: null, links: null);

        // Assert
        Assert.Null(workflow.StartAt);
        Assert.Null(workflow.DistributedTraceContext);
        Assert.Null(workflow.InstanceLockKey);
        Assert.Null(workflow.Dependencies);
        Assert.Null(workflow.Links);
    }

    [Fact]
    public void FromRequest_WithDependenciesAndLinks_MapsCorrectly()
    {
        // Arrange
        var depGuid = Guid.NewGuid();
        var linkGuid = Guid.NewGuid();

        var dependency = new Workflow
        {
            DatabaseId = depGuid,
            OperationId = "dep-op",
            IdempotencyKey = "dep-key",
            Namespace = "default",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var link = new Workflow
        {
            DatabaseId = linkGuid,
            OperationId = "link-op",
            IdempotencyKey = "link-key",
            Namespace = "default",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };

        var workflowRequest = new WorkflowRequest
        {
            OperationId = "op-1",
            Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
        };

        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: _randomInstance,
            Actor: _randomActor,
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null,
            Namespace: "default"
        );

        // Act
        var workflow = Workflow.FromRequest(
            workflowRequest,
            metadata,
            "wf-1-key",
            dependencies: [dependency],
            links: [link]
        );

        // Assert
        Assert.NotNull(workflow.Dependencies);
        Assert.Single(workflow.Dependencies);
        Assert.Equal(depGuid, workflow.Dependencies.First().DatabaseId);

        Assert.NotNull(workflow.Links);
        Assert.Single(workflow.Links);
        Assert.Equal(linkGuid, workflow.Links.First().DatabaseId);
    }
}
