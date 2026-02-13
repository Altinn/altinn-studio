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
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange

        var sharedKey1 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-1-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var sharedKey2 = new Workflow
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "workflow-2-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };
        var uniqueKey = new Workflow
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "workflow-3-operation",
            Actor = _randomActor,
            InstanceInformation = _randomInstance,
            Steps = [],
        };

        // Act
        bool shouldBeEqual1 = sharedKey1 == sharedKey2;
        bool shouldBeEqual2 = sharedKey1.Equals(sharedKey2);

        bool shouldNotBeEqual1 = uniqueKey == sharedKey1;
        bool shouldNotBeEqual2 = uniqueKey.Equals(sharedKey1);

        bool shouldContain = new[] { sharedKey1, uniqueKey }.Contains(sharedKey2);

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
        var steps = new[]
        {
            new StepRequest { Command = new Command.AppCommand("step-1") },
            new StepRequest { Command = new Command.AppCommand("step-2"), RetryStrategy = retryStrategy },
        };
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(10);
        var traceContext = "trace-context-123";

        var request = new EngineRequest(
            "idempotency-key-1",
            "next",
            instanceInfo,
            actor,
            createdAt,
            startAt,
            steps,
            traceContext,
            "lock-key-1"
        );

        // Act
        var workflow = Workflow.FromRequest(request);

        // Assert — Workflow fields
        Assert.Equal("idempotency-key-1", workflow.IdempotencyKey);
        Assert.Equal("next", workflow.OperationId);
        Assert.Same(instanceInfo, workflow.InstanceInformation);
        Assert.Same(actor, workflow.Actor);
        Assert.Equal(createdAt, workflow.CreatedAt);
        Assert.Equal(startAt, workflow.StartAt);
        Assert.Equal(traceContext, workflow.DistributedTraceContext);
        Assert.Equal("lock-key-1", workflow.InstanceLockKey);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);

        // Assert — Steps are created with correct count and ordering
        Assert.Equal(2, workflow.Steps.Count);
        Assert.Equal(0, workflow.Steps[0].ProcessingOrder);
        Assert.Equal(1, workflow.Steps[1].ProcessingOrder);

        // Assert — Step fields are mapped from parent request
        Assert.Equal("idempotency-key-1/step-1", workflow.Steps[0].IdempotencyKey);
        Assert.Equal("idempotency-key-1/step-2", workflow.Steps[1].IdempotencyKey);
        Assert.Same(actor, workflow.Steps[0].Actor);
        Assert.Equal(createdAt, workflow.Steps[0].CreatedAt);
    }

    [Fact]
    public void FromRequest_MapsNullOptionalFields()
    {
        // Arrange
        var request = new EngineRequest(
            "key-1",
            "op-1",
            new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            new Actor { UserIdOrOrgNumber = "user-1" },
            DateTimeOffset.UtcNow,
            null, // StartAt
            [new StepRequest { Command = new Command.Debug.Noop() }],
            null, // TraceContext
            null // InstanceLockKey
        );

        // Act
        var workflow = Workflow.FromRequest(request);

        // Assert
        Assert.Null(workflow.StartAt);
        Assert.Null(workflow.DistributedTraceContext);
        Assert.Null(workflow.InstanceLockKey);
    }
}
