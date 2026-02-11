using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class PersistentItemStatusExtensionsTests
{
    [Theory]
    [InlineData(PersistentItemStatus.Completed, true)]
    [InlineData(PersistentItemStatus.Failed, true)]
    [InlineData(PersistentItemStatus.Canceled, true)]
    [InlineData(PersistentItemStatus.Enqueued, false)]
    [InlineData(PersistentItemStatus.Processing, false)]
    [InlineData(PersistentItemStatus.Requeued, false)]
    public void IsDone_ReturnsExpectedResult(PersistentItemStatus status, bool expected)
    {
        // Act
        var result = status.IsDone();

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(PersistentItemStatus.Completed, true)]
    [InlineData(PersistentItemStatus.Failed, false)]
    [InlineData(PersistentItemStatus.Canceled, false)]
    [InlineData(PersistentItemStatus.Enqueued, false)]
    [InlineData(PersistentItemStatus.Processing, false)]
    [InlineData(PersistentItemStatus.Requeued, false)]
    public void IsSuccessful_ReturnsExpectedResult(PersistentItemStatus status, bool expected)
    {
        // Act
        var result = status.IsSuccessful();

        // Assert
        Assert.Equal(expected, result);
    }
}
