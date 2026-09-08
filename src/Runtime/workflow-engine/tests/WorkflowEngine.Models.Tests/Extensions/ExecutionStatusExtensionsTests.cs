using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class ExecutionStatusExtensionsTests
{
    [Theory]
    [InlineData(ExecutionStatus.Success, true, false, false, false, false, false)]
    [InlineData(ExecutionStatus.Canceled, false, true, false, false, false, false)]
    [InlineData(ExecutionStatus.RetryableError, false, false, true, false, false, false)]
    [InlineData(ExecutionStatus.CriticalError, false, false, false, true, false, false)]
    [InlineData(ExecutionStatus.Deferred, false, false, false, false, true, false)]
    [InlineData(ExecutionStatus.Skipped, false, false, false, false, false, true)]
    public void ExtensionMethods_ReturnExpectedFlags(
        ExecutionStatus status,
        bool isSuccess,
        bool isCanceled,
        bool isRetryableError,
        bool isCriticalError,
        bool isDeferred,
        bool isSkipped
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
            ExecutionStatus.Skipped => ExecutionResult.Skip("acquireConcurrencyConflict"),
            _ => throw new ArgumentOutOfRangeException(nameof(status)),
        };

        // Act & Assert
        Assert.Equal(isSuccess, result.IsSuccess());
        Assert.Equal(isCanceled, result.IsCanceled());
        Assert.Equal(isRetryableError, result.IsRetryableError());
        Assert.Equal(isCriticalError, result.IsCriticalError());
        Assert.Equal(isDeferred, result.IsDeferred());
        Assert.Equal(isSkipped, result.IsSkipped());
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

    [Fact]
    public void Skip_CarriesReason()
    {
        var result = ExecutionResult.Skip("acquireConcurrencyConflict");

        Assert.Equal(ExecutionStatus.Skipped, result.Status);
        Assert.Equal("acquireConcurrencyConflict", result.Message);
        Assert.Null(result.Exception);
        Assert.Null(result.HttpStatusCode);
        Assert.Null(result.DeferDelay);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Skip_RejectsBlankReason(string? reason)
    {
        // The reason is the code consumers classify on, so a skip without one is a programming error.
        Assert.ThrowsAny<ArgumentException>(() => ExecutionResult.Skip(reason!));
    }
}
