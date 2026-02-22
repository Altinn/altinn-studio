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
    public void FromRequest_AssignsCorrelationId_ForPairedAppCommandAndReplyAppCommand()
    {
        // Arrange
        var engineRequest = new EngineRequest(
            "test-key",
            "test-op",
            _randomInstance,
            _randomActor,
            DateTimeOffset.UtcNow,
            [
                new StepRequest { Command = new Command.AppCommand("validate", Payload: "data") },
                new StepRequest { Command = new Command.ReplyAppCommand("validate", Payload: "context") },
                new StepRequest { Command = new Command.AppCommand("finalize") },
            ],
            null,
            "lock-key"
        );

        // Act
        var workflow = Workflow.FromRequest(engineRequest);

        // Assert — first two steps should share a CorrelationId
        Assert.NotNull(workflow.Steps[0].CorrelationId);
        Assert.NotNull(workflow.Steps[1].CorrelationId);
        Assert.Equal(workflow.Steps[0].CorrelationId, workflow.Steps[1].CorrelationId);

        // Third step should not have a CorrelationId
        Assert.Null(workflow.Steps[2].CorrelationId);
    }

    [Fact]
    public void FromRequest_DoesNotAssignCorrelationId_WhenCommandKeysDoNotMatch()
    {
        // Arrange
        var engineRequest = new EngineRequest(
            "test-key",
            "test-op",
            _randomInstance,
            _randomActor,
            DateTimeOffset.UtcNow,
            [
                new StepRequest { Command = new Command.AppCommand("validate") },
                new StepRequest { Command = new Command.ReplyAppCommand("different-key") },
            ],
            null,
            "lock-key"
        );

        // Act
        var workflow = Workflow.FromRequest(engineRequest);

        // Assert — no correlation since keys don't match
        Assert.Null(workflow.Steps[0].CorrelationId);
        Assert.Null(workflow.Steps[1].CorrelationId);
    }

    [Fact]
    public void FromRequest_DoesNotAssignCorrelationId_ForStandaloneAppCommand()
    {
        // Arrange
        var engineRequest = new EngineRequest(
            "test-key",
            "test-op",
            _randomInstance,
            _randomActor,
            DateTimeOffset.UtcNow,
            [new StepRequest { Command = new Command.AppCommand("validate") }],
            null,
            "lock-key"
        );

        // Act
        var workflow = Workflow.FromRequest(engineRequest);

        // Assert
        Assert.Null(workflow.Steps[0].CorrelationId);
    }

    [Fact]
    public void FromRequest_AssignsDistinctCorrelationIds_ForMultiplePairs()
    {
        // Arrange
        var engineRequest = new EngineRequest(
            "test-key",
            "test-op",
            _randomInstance,
            _randomActor,
            DateTimeOffset.UtcNow,
            [
                new StepRequest { Command = new Command.AppCommand("sign") },
                new StepRequest { Command = new Command.ReplyAppCommand("sign") },
                new StepRequest { Command = new Command.AppCommand("pay") },
                new StepRequest { Command = new Command.ReplyAppCommand("pay") },
            ],
            null,
            "lock-key"
        );

        // Act
        var workflow = Workflow.FromRequest(engineRequest);

        // Assert — each pair should have its own CorrelationId
        Assert.NotNull(workflow.Steps[0].CorrelationId);
        Assert.Equal(workflow.Steps[0].CorrelationId, workflow.Steps[1].CorrelationId);

        Assert.NotNull(workflow.Steps[2].CorrelationId);
        Assert.Equal(workflow.Steps[2].CorrelationId, workflow.Steps[3].CorrelationId);

        // The two pairs should have different CorrelationIds
        Assert.NotEqual(workflow.Steps[0].CorrelationId, workflow.Steps[2].CorrelationId);
    }

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
}
