using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class ExecutionStatusExtensionsTests
{
    [Theory]
    [InlineData(ExecutionStatus.Success, true, false, false, false, false)]
    [InlineData(ExecutionStatus.Canceled, false, true, false, false, false)]
    [InlineData(ExecutionStatus.RetryableError, false, false, true, false, false)]
    [InlineData(ExecutionStatus.CriticalError, false, false, false, true, false)]
    [InlineData(ExecutionStatus.Deferred, false, false, false, false, true)]
    public void ExtensionMethods_ReturnExpectedFlags(
        ExecutionStatus status,
        bool isSuccess,
        bool isCanceled,
        bool isRetryableError,
        bool isCriticalError,
        bool isDeferred
    )
    {
        // Arrange
        var result = status switch
        {
            ExecutionStatus.Success => ExecutionResult.Success(),
            ExecutionStatus.Canceled => ExecutionResult.Canceled(),
            ExecutionStatus.RetryableError => ExecutionResult.RetryableError("test error"),
            ExecutionStatus.CriticalError => ExecutionResult.CriticalError("test error"),
            ExecutionStatus.Deferred => ExecutionResult.Defer(TimeSpan.FromMinutes(1)),
            _ => throw new ArgumentOutOfRangeException(nameof(status)),
        };

        // Act & Assert
        Assert.Equal(isSuccess, result.IsSuccess());
        Assert.Equal(isCanceled, result.IsCanceled());
        Assert.Equal(isRetryableError, result.IsRetryableError());
        Assert.Equal(isCriticalError, result.IsCriticalError());
        Assert.Equal(isDeferred, result.IsDeferred());
    }

    [Fact]
    public void Defer_CarriesDelayAndMessage()
    {
        var result = ExecutionResult.Defer(TimeSpan.FromMinutes(5), "not ready");

        Assert.Equal(ExecutionStatus.Deferred, result.Status);
        Assert.Equal(TimeSpan.FromMinutes(5), result.DeferDelay);
        Assert.Equal("not ready", result.Message);
        Assert.Null(result.Exception);
    }
}
