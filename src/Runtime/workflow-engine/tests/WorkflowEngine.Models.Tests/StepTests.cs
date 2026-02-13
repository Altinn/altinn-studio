using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models.Tests;

public class StepTests
{
    private static Command.AppCommand _randomAppCommand => new(Guid.NewGuid().ToString());
    private static Actor _randomActor => new() { UserIdOrOrgNumber = Guid.NewGuid().ToString() };

    [Fact]
    public void Equality_Uses_IdempotencyKey()
    {
        // Arrange

        var sharedKey1 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-1-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var sharedKey2 = new Step
        {
            IdempotencyKey = "shared-idempotency-key",
            OperationId = "step-2-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var uniqueKey = new Step
        {
            IdempotencyKey = "unique-idempotency-key",
            OperationId = "step-3-command",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
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
        var command = new Command.AppCommand("process-payment");
        var retryStrategy = RetryStrategy.Exponential(baseInterval: TimeSpan.FromSeconds(2));
        var createdAt = DateTimeOffset.UtcNow;

        var parentRequest = new EngineRequest(
            "parent-key",
            "next",
            new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.NewGuid(),
            },
            actor,
            createdAt,
            null,
            []
        );

        var stepRequest = new StepRequest { Command = command, RetryStrategy = retryStrategy };

        // Act
        var step = Step.FromRequest(parentRequest, stepRequest, createdAt, index: 2);

        // Assert
        Assert.Equal(0, step.DatabaseId);
        Assert.Equal("parent-key/process-payment", step.IdempotencyKey);
        Assert.Equal("process-payment", step.OperationId);
        Assert.Same(actor, step.Actor);
        Assert.Equal(createdAt, step.CreatedAt);
        Assert.Equal(2, step.ProcessingOrder);
        Assert.Same(command, step.Command);
        Assert.Same(retryStrategy, step.RetryStrategy);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
    }

    [Fact]
    public void FromRequest_UsesParentActorNotStepSpecificActor()
    {
        // Arrange
        var parentActor = new Actor { UserIdOrOrgNumber = "parent-user" };
        var parentRequest = new EngineRequest(
            "key-1",
            "op-1",
            new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            parentActor,
            DateTimeOffset.UtcNow,
            null,
            []
        );

        var stepRequest = new StepRequest { Command = new Command.Debug.Noop() };

        // Act
        var step = Step.FromRequest(parentRequest, stepRequest, DateTimeOffset.UtcNow, index: 0);

        // Assert
        Assert.Same(parentActor, step.Actor);
    }

    [Fact]
    public void FromRequest_DefaultsOptionalFieldsCorrectly()
    {
        // Arrange
        var parentRequest = new EngineRequest(
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
            null,
            []
        );

        var stepRequest = new StepRequest { Command = new Command.Debug.Noop() };

        // Act
        var step = Step.FromRequest(parentRequest, stepRequest, DateTimeOffset.UtcNow, index: 0);

        // Assert
        Assert.Null(step.RetryStrategy);
        Assert.Null(step.BackoffUntil);
        Assert.Equal(0, step.RequeueCount);
    }
}
