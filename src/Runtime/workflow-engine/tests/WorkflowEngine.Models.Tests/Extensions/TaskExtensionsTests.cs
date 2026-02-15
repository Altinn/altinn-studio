using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class TaskExtensionsTests
{
    [Fact]
    public void Status_ReturnsNone_WhenTaskIsNull()
    {
        // Arrange
        Task? task = null;

        // Act
        var result = task.Status();

        // Assert
        Assert.Equal(TaskStatus.None, result);
    }

    [Fact]
    public void Status_ReturnsStarted_WhenTaskIsRunning()
    {
        // Arrange
        var tcs = new TaskCompletionSource();
        Task task = tcs.Task;

        // Act
        var result = task.Status();

        // Assert
        Assert.Equal(TaskStatus.Started, result);
    }

    [Fact]
    public void Status_ReturnsFinished_WhenTaskIsCompleted()
    {
        // Arrange
        var task = Task.CompletedTask;

        // Act
        var result = task.Status();

        // Assert
        Assert.Equal(TaskStatus.Finished, result);
    }

    [Fact]
    public void Status_ReturnsFailed_WhenTaskIsFaulted()
    {
        // Arrange
        var task = Task.FromException(new InvalidOperationException("test"));

        // Act
        var result = task.Status();

        // Assert
        Assert.Equal(TaskStatus.Failed, result);
    }
}
