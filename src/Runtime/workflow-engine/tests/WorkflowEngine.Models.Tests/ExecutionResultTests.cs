namespace WorkflowEngine.Models.Tests;

public class ExecutionResultTests
{
    [Fact]
    public void Success_CreatesResultWithSuccessStatus()
    {
        // Act
        var result = ExecutionResult.Success();

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Null(result.Message);
        Assert.Null(result.Exception);
    }

    [Fact]
    public void Canceled_CreatesResultWithCanceledStatus()
    {
        // Act
        var result = ExecutionResult.Canceled();

        // Assert
        Assert.Equal(ExecutionStatus.Canceled, result.Status);
        Assert.Null(result.Message);
        Assert.Null(result.Exception);
    }

    [Fact]
    public void RetryableError_WithMessage_CreatesResultWithRetryableErrorStatus()
    {
        // Act
        var result = ExecutionResult.RetryableError("something failed");

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Equal("something failed", result.Message);
        Assert.Null(result.Exception);
    }

    [Fact]
    public void RetryableError_WithException_CreatesResultWithMessageFromException()
    {
        // Arrange
        var exception = new InvalidOperationException("bad state");

        // Act
        var result = ExecutionResult.RetryableError(exception);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Equal("bad state", result.Message);
        Assert.Same(exception, result.Exception);
    }

    [Fact]
    public void CriticalError_WithMessage_CreatesResultWithCriticalErrorStatus()
    {
        // Act
        var result = ExecutionResult.CriticalError("fatal error");

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal("fatal error", result.Message);
        Assert.Null(result.Exception);
    }
}
