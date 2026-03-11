using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models.Tests;

public class StepTests
{
    private static CommandDefinition _randomCommand => new() { Type = "app" };

    [Fact]
    public void Equality_Uses_DatabaseId()
    {
        // Arrange

        var sharedGuid = Guid.NewGuid();

        var sharedId1 = new Step
        {
            DatabaseId = sharedGuid,
            OperationId = "step-1-command",
            IdempotencyKey = "key-1",
            ProcessingOrder = 0,
            Command = _randomCommand,
        };
        var sharedId2 = new Step
        {
            DatabaseId = sharedGuid,
            OperationId = "step-2-command",
            IdempotencyKey = "key-2",
            ProcessingOrder = 0,
            Command = _randomCommand,
        };
        var uniqueId = new Step
        {
            DatabaseId = Guid.NewGuid(),
            OperationId = "step-3-command",
            IdempotencyKey = "key-3",
            ProcessingOrder = 0,
            Command = _randomCommand,
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
    public void Step_ConstructsWithRequiredFields()
    {
        // Arrange
        var command = new CommandDefinition { Type = "app" };
        var retryStrategy = RetryStrategy.Exponential(baseInterval: TimeSpan.FromSeconds(2));
        var createdAt = DateTimeOffset.UtcNow;

        // Act
        var step = new Step
        {
            OperationId = "process-payment",
            IdempotencyKey = "step-key",
            CreatedAt = createdAt,
            ProcessingOrder = 2,
            Command = command,
            RetryStrategy = retryStrategy,
            Status = PersistentItemStatus.Enqueued,
        };

        // Assert
        Assert.Equal("process-payment", step.OperationId);
        Assert.Equal(createdAt, step.CreatedAt);
        Assert.Equal(2, step.ProcessingOrder);
        Assert.Same(command, step.Command);
        Assert.Same(retryStrategy, step.RetryStrategy);
        Assert.Equal(PersistentItemStatus.Enqueued, step.Status);
    }

    [Fact]
    public void Step_DefaultsOptionalFieldsCorrectly()
    {
        // Arrange & Act
        var step = new Step
        {
            OperationId = "noop",
            IdempotencyKey = "step-key",
            ProcessingOrder = 0,
            Command = new CommandDefinition { Type = "noop" },
        };

        // Assert
        Assert.Null(step.RetryStrategy);
        Assert.Null(step.BackoffUntil);
        Assert.Equal(0, step.RequeueCount);
    }
}
