using System.Net.Sockets;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Resilience.Models;

// S3871: Exceptions should be public.
#pragma warning disable S3871

namespace WorkflowEngine.Repository.Tests;

public sealed class RetryErrorHandlerTests
{
    [Theory]
    [InlineData(typeof(TimeoutException))]
    [InlineData(typeof(SocketException))]
    [InlineData(typeof(HttpRequestException))]
    [InlineData(typeof(InvalidOperationException))]
    public void RetryableExceptionTypes_ReturnsRetry(Type exceptionType)
    {
        var exception = (Exception)Activator.CreateInstance(exceptionType)!;
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    [Fact]
    public void ExceptionWithTimeoutInTypeName_ReturnsRetry()
    {
        var exception = new NpgsqlTimeoutFakeException("test");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    [Fact]
    public void ExceptionWithConnectionInTypeName_ReturnsRetry()
    {
        var exception = new NpgsqlConnectionFakeException("test");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    [Fact]
    public void ExceptionWithTimeoutInMessage_ReturnsRetry()
    {
        var exception = new Exception("The operation has timed out — timeout exceeded");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    [Fact]
    public void ExceptionWithConnectionInMessage_ReturnsRetry()
    {
        var exception = new Exception("Could not open connection to server");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    [Fact]
    public void ArgumentNullException_ReturnsAbort()
    {
        var exception = new ArgumentNullException("param");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Abort, decision);
    }

    [Fact]
    public void ArgumentException_ReturnsAbort()
    {
        var exception = new ArgumentException("bad arg");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Abort, decision);
    }

    [Fact]
    public void GenericException_ReturnsRetry()
    {
        var exception = new Exception("something unexpected");
        var decision = EnginePgRepository.RetryErrorHandler(exception);
        Assert.Equal(RetryDecision.Retry, decision);
    }

    // Fake exception types to test type-name matching
    private sealed class NpgsqlTimeoutFakeException(string message) : Exception(message);

    private sealed class NpgsqlConnectionFakeException(string message) : Exception(message);
}
