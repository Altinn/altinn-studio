using Microsoft.Extensions.Diagnostics.HealthChecks;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Tests;

public sealed class EngineHealthCheckTests : IDisposable
{
    private readonly ConcurrencyLimiter _concurrencyLimiter = new(
        maxConcurrentDbOperations: 10,
        maxConcurrentHttpCalls: 10
    );

    public void Dispose() => _concurrencyLimiter.Dispose();

    private (EngineHealthCheck HealthCheck, Mock<IEngine> EngineMock) CreateHealthCheck(
        EngineHealthStatus status,
        int inboxCount = 0,
        int inboxCapacityLimit = 100
    )
    {
        var engineMock = new Mock<IEngine>();
        engineMock.Setup(e => e.Status).Returns(status);
        engineMock.Setup(e => e.InboxCount).Returns(inboxCount);
        engineMock.Setup(e => e.InboxCapacityLimit).Returns(inboxCapacityLimit);
        return (new EngineHealthCheck(engineMock.Object, _concurrencyLimiter), engineMock);
    }

    [Fact]
    public async Task CheckHealthAsync_HealthyAndRunning_ReturnsHealthy()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.Healthy | EngineHealthStatus.Running);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HealthStatus.Healthy, result.Status);
        Assert.Equal("Engine is operational", result.Description);
    }

    [Fact]
    public async Task CheckHealthAsync_Unhealthy_ReturnsUnhealthy()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.Unhealthy);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal("Engine is unhealthy", result.Description);
    }

    [Fact]
    public async Task CheckHealthAsync_Stopped_ReturnsUnhealthy()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.Stopped);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    [Fact]
    public async Task CheckHealthAsync_Disabled_ReturnsDegraded()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.Disabled);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HealthStatus.Degraded, result.Status);
        Assert.Equal("Engine is degraded", result.Description);
    }

    [Fact]
    public async Task CheckHealthAsync_QueueFull_ReturnsDegraded()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.QueueFull | EngineHealthStatus.Running);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HealthStatus.Degraded, result.Status);
    }

    [Fact]
    public async Task CheckHealthAsync_UnhealthyTakesPrecedenceOverDegraded()
    {
        // Arrange — both unhealthy and degraded flags set
        var (healthCheck, _) = CreateHealthCheck(EngineHealthStatus.Unhealthy | EngineHealthStatus.QueueFull);

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert — unhealthy should win
        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    [Fact]
    public async Task CheckHealthAsync_IncludesStatusAndQueueInData()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(
            EngineHealthStatus.Healthy | EngineHealthStatus.Running,
            inboxCount: 42,
            inboxCapacityLimit: 100
        );

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.NotNull(result.Data);
        Assert.Equal("Healthy, Running", result.Data["status"]);
        var queueData = Assert.IsType<Dictionary<string, int>>(result.Data["queue"]);
        Assert.Equal(42, queueData["count"]);
        Assert.Equal(100, queueData["limit"]);
    }
}
