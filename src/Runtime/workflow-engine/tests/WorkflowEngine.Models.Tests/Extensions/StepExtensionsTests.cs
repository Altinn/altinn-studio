using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class StepExtensionsTests
{
    private static Step CreateStep(
        PersistentItemStatus status = PersistentItemStatus.Enqueued,
        DateTimeOffset? startAt = null,
        DateTimeOffset? backoffUntil = null,
        DateTimeOffset? createdAt = null
    ) =>
        new()
        {
            IdempotencyKey = "test-key",
            OperationId = "test-op",
            Actor = new Actor { UserIdOrOrgNumber = "user-1" },
            ProcessingOrder = 0,
            Command = new Command.Debug.Noop(),
            Status = status,
            StartAt = startAt,
            BackoffUntil = backoffUntil,
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow,
        };

    [Fact]
    public void IsReadyForExecution_ReturnsTrue_WhenNoConstraints()
    {
        // Arrange
        var step = CreateStep();
        var now = DateTimeOffset.UtcNow;

        // Act
        var result = step.IsReadyForExecution(now);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsReadyForExecution_ReturnsFalse_WhenBackoffUntilInFuture()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var step = CreateStep(backoffUntil: now.AddMinutes(5));

        // Act
        var result = step.IsReadyForExecution(now);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsReadyForExecution_ReturnsFalse_WhenStartAtInFuture()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var step = CreateStep(startAt: now.AddMinutes(5));

        // Act
        var result = step.IsReadyForExecution(now);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsReadyForExecution_ReturnsTrue_WhenBackoffUntilInPast()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var step = CreateStep(backoffUntil: now.AddMinutes(-5));

        // Act
        var result = step.IsReadyForExecution(now);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsReadyForExecution_ReturnsTrue_WhenStartAtInPast()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var step = CreateStep(startAt: now.AddMinutes(-5));

        // Act
        var result = step.IsReadyForExecution(now);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void GetActualStartTime_ReturnsCreatedAt_WhenStartAtIsNull()
    {
        // Arrange
        var createdAt = DateTimeOffset.UtcNow;
        var step = CreateStep(createdAt: createdAt);

        // Act
        var result = step.GetActualStartTime();

        // Assert
        Assert.Equal(createdAt, result);
    }

    [Fact]
    public void GetActualStartTime_ReturnsStartAt_WhenStartAtIsAfterCreatedAt()
    {
        // Arrange
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(10);
        var step = CreateStep(startAt: startAt, createdAt: createdAt);

        // Act
        var result = step.GetActualStartTime();

        // Assert
        Assert.Equal(startAt, result);
    }

    [Fact]
    public void GetActualStartTime_ReturnsCreatedAt_WhenStartAtIsBeforeCreatedAt()
    {
        // Arrange
        var createdAt = DateTimeOffset.UtcNow;
        var startAt = createdAt.AddMinutes(-10);
        var step = CreateStep(startAt: startAt, createdAt: createdAt);

        // Act
        var result = step.GetActualStartTime();

        // Assert
        Assert.Equal(createdAt, result);
    }

    [Theory]
    [InlineData(PersistentItemStatus.Completed, true)]
    [InlineData(PersistentItemStatus.Failed, true)]
    [InlineData(PersistentItemStatus.Canceled, true)]
    [InlineData(PersistentItemStatus.Enqueued, false)]
    [InlineData(PersistentItemStatus.Processing, false)]
    public void IsDone_ReturnsExpectedResult(PersistentItemStatus status, bool expected)
    {
        // Arrange
        var step = CreateStep(status: status);

        // Act
        var result = step.IsDone();

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void IsIncomplete_ReturnsTrue_WhenStatusIsNotDone()
    {
        // Arrange
        var step = CreateStep(status: PersistentItemStatus.Enqueued);

        // Act
        var result = step.IsIncomplete();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsComplete_ReturnsTrue_WhenDoneAndNoOutstandingTasks()
    {
        // Arrange
        var step = CreateStep(status: PersistentItemStatus.Completed);

        // Act
        var result = step.IsComplete();

        // Assert
        Assert.True(result);
    }
}
