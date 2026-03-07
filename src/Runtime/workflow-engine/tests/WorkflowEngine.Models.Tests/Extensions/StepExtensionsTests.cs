using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class StepExtensionsTests
{
    private static Step CreateStep(
        PersistentItemStatus status = PersistentItemStatus.Enqueued,
        DateTimeOffset? createdAt = null
    ) =>
        new()
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Actor = new Actor { UserIdOrOrgNumber = "user-1" },
            ProcessingOrder = 0,
            Command = new Command.Debug.Noop(),
            Status = status,
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow,
        };

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
        var result = step.Status.IsDone();

        // Assert
        Assert.Equal(expected, result);
    }
}
