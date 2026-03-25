using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class ExecutionStatusExtensionsTests
{
    [Theory]
    [InlineData(ExecutionStatus.Success, true, false, false, false)]
    [InlineData(ExecutionStatus.Canceled, false, true, false, false)]
    [InlineData(ExecutionStatus.RetryableError, false, false, true, false)]
    [InlineData(ExecutionStatus.CriticalError, false, false, false, true)]
    public void ExtensionMethods_ReturnExpectedFlags(
        ExecutionStatus status,
        bool isSuccess,
        bool isCanceled,
        bool isRetryableError,
        bool isCriticalError
    )
    {
        // Arrange
        var result = status switch
        {
            ExecutionStatus.Success => ExecutionResult.Success(),
            ExecutionStatus.Canceled => ExecutionResult.Canceled(),
            ExecutionStatus.RetryableError => ExecutionResult.RetryableError("test error"),
            ExecutionStatus.CriticalError => ExecutionResult.CriticalError("test error"),
            _ => throw new ArgumentOutOfRangeException(nameof(status)),
        };

        // Act & Assert
        Assert.Equal(isSuccess, result.IsSuccess());
        Assert.Equal(isCanceled, result.IsCanceled());
        Assert.Equal(isRetryableError, result.IsRetryableError());
        Assert.Equal(isCriticalError, result.IsCriticalError());
    }
}
