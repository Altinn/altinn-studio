using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models.Tests;

public class StepTests
{
    private static Command.AppCommand _randomAppCommand => new(Guid.NewGuid().ToString());
    private static Actor _randomActor => new() { UserIdOrOrgNumber = Guid.NewGuid().ToString() };

    [Fact]
    public void Equality_Uses_DatabaseId()
    {
        // Arrange

        var sharedId1 = new Step
        {
            DatabaseId = 42,
            OperationId = "step-1-command",
            IdempotencyKey = "key-1",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var sharedId2 = new Step
        {
            DatabaseId = 42,
            OperationId = "step-2-command",
            IdempotencyKey = "key-2",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
        };
        var uniqueId = new Step
        {
            DatabaseId = 99,
            OperationId = "step-3-command",
            IdempotencyKey = "key-3",
            Actor = _randomActor,
            ProcessingOrder = 0,
            Command = _randomAppCommand,
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
        var command = new Command.AppCommand("process-payment");
        var retryStrategy = RetryStrategy.Exponential(baseInterval: TimeSpan.FromSeconds(2));
        var createdAt = DateTimeOffset.UtcNow;

        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: actor,
            CreatedAt: createdAt,
            TraceContext: null,
            InstanceLockKey: null
        );

        var stepRequest = new StepRequest { Command = command, RetryStrategy = retryStrategy };

        // Act
        var parentRequest = new WorkflowRequest
        {
            Ref = "wf-1",
            OperationId = "op-1",
            IdempotencyKey = "parent-key",
            Type = WorkflowType.Generic,
            Steps = [stepRequest],
        };

        var step = Step.FromRequest(parentRequest, stepRequest, metadata, index: 2);

        // Assert
        Assert.Equal(0, step.DatabaseId);
        Assert.Equal("process-payment", step.OperationId);
        Assert.Same(actor, step.Actor);
        Assert.Equal(createdAt, step.CreatedAt);
        Assert.Equal(2, step.ProcessingOrder);
        Assert.Same(command, step.Command);
        Assert.Same(retryStrategy, step.RetryStrategy);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
    }

    [Fact]
    public void FromRequest_UsesMetadataActor()
    {
        // Arrange
        var actor = new Actor { UserIdOrOrgNumber = "metadata-user" };
        var metadata = new WorkflowRequestMetadata(
            InstanceInformation: new InstanceInformation
            {
                Org = "ttd",
                App = "app",
                InstanceOwnerPartyId = 1,
                InstanceGuid = Guid.NewGuid(),
            },
            Actor: actor,
            CreatedAt: DateTimeOffset.UtcNow,
            TraceContext: null,
            InstanceLockKey: null
        );

        var stepRequest = new StepRequest { Command = new Command.Debug.Noop() };
        var parentRequest = new WorkflowRequest
        {
            Ref = "wf-1",
            OperationId = "op-1",
            IdempotencyKey = "parent-key",
            Type = WorkflowType.Generic,
            Steps = [stepRequest],
        };

        // Act
        var step = Step.FromRequest(parentRequest, stepRequest, metadata, index: 0);

        // Assert
        Assert.Same(actor, step.Actor);
    }

    [Fact]
    public void FromRequest_DefaultsOptionalFieldsCorrectly()
    {
        // Arrange
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
            InstanceLockKey: null
        );

        var stepRequest = new StepRequest { Command = new Command.Debug.Noop() };
        var parentRequest = new WorkflowRequest
        {
            Ref = "wf-1",
            OperationId = "op-1",
            IdempotencyKey = "parent-key",
            Type = WorkflowType.Generic,
            Steps = [stepRequest],
        };

        // Act
        var step = Step.FromRequest(parentRequest, stepRequest, metadata, index: 0);

        // Assert
        Assert.Null(step.RetryStrategy);
        Assert.Null(step.BackoffUntil);
        Assert.Equal(0, step.RequeueCount);
    }
}
