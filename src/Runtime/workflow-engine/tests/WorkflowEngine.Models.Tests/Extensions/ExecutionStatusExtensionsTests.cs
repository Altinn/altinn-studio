using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class ExecutionStatusExtensionsTests
{
    [Fact]
    public void IsSuccess_ReturnsTrue_ForSuccessStatus()
    {
        // Arrange
        var result = ExecutionResult.Success();

        // Act & Assert
        Assert.True(result.IsSuccess());
        Assert.False(result.IsCanceled());
        Assert.False(result.IsRetryableError());
        Assert.False(result.IsCriticalError());
    }

    [Fact]
    public void IsCanceled_ReturnsTrue_ForCanceledStatus()
    {
        // Arrange
        var result = ExecutionResult.Canceled();

        // Act & Assert
        Assert.True(result.IsCanceled());
        Assert.False(result.IsSuccess());
        Assert.False(result.IsRetryableError());
        Assert.False(result.IsCriticalError());
    }

    [Fact]
    public void IsRetryableError_ReturnsTrue_ForRetryableErrorStatus()
    {
        // Arrange
        var result = ExecutionResult.RetryableError("test error");

        // Act & Assert
        Assert.True(result.IsRetryableError());
        Assert.False(result.IsSuccess());
        Assert.False(result.IsCanceled());
        Assert.False(result.IsCriticalError());
    }

    [Fact]
    public void IsCriticalError_ReturnsTrue_ForCriticalErrorStatus()
    {
        // Arrange
        var result = ExecutionResult.CriticalError("test error");

        // Act & Assert
        Assert.True(result.IsCriticalError());
        Assert.False(result.IsSuccess());
        Assert.False(result.IsCanceled());
        Assert.False(result.IsRetryableError());
    }
}
