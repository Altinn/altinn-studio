namespace WorkflowEngine.Models.Tests;

public class ExecutionResultTests
{
    [Theory]
    [InlineData(ExecutionStatus.Success)]
    [InlineData(ExecutionStatus.Canceled)]
    public void FactoryMethod_WithNoArgs_CreatesResultWithNullMessageAndException(ExecutionStatus status)
    {
        // Act
        var result = status switch
        {
            ExecutionStatus.Success => ExecutionResult.Success(),
            ExecutionStatus.Canceled => ExecutionResult.Canceled(),
            _ => throw new ArgumentOutOfRangeException(nameof(status)),
        };

        // Assert
        Assert.Equal(status, result.Status);
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

    [Fact]
    public void Success_WithState_CarriesState()
    {
        var result = ExecutionResult.Success("produced");

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Equal("produced", result.StateOut);
    }

    [Fact]
    public void Defer_WithState_CarriesDelayReasonAndState()
    {
        var result = ExecutionResult.Defer(TimeSpan.FromSeconds(30), "waiting", "carried");

        Assert.Equal(ExecutionStatus.Deferred, result.Status);
        Assert.Equal(TimeSpan.FromSeconds(30), result.DeferDelay);
        Assert.Equal("waiting", result.Message);
        Assert.Equal("carried", result.StateOut);
    }
}
