using Microsoft.Extensions.Diagnostics.HealthChecks;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Tests;

public class EngineHealthCheckTests
{
    private static (EngineHealthCheck HealthCheck, Mock<IEngine> EngineMock) CreateHealthCheck(
        EngineHealthStatus status,
        int inboxCount = 0
    )
    {
        var engineMock = new Mock<IEngine>();
        engineMock.Setup(e => e.Status).Returns(status);
        engineMock.Setup(e => e.InboxCount).Returns(inboxCount);
        var concurrencyLimiterMock = new Mock<IConcurrencyLimiter>();
        concurrencyLimiterMock.Setup(x => x.DbSlotStatus).Returns(new ConcurrencyLimiter.SlotStatus(50, 50, 100));
        concurrencyLimiterMock.Setup(x => x.HttpSlotStatus).Returns(new ConcurrencyLimiter.SlotStatus(50, 50, 100));

        return (new EngineHealthCheck(engineMock.Object, concurrencyLimiterMock.Object), engineMock);
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
            inboxCount: 42
        );

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.NotNull(result.Data);
        Assert.Equal("Healthy, Running", result.Data["status"]);
        Assert.True(result.Data["queue"] is Dictionary<string, int> dict && dict["count"] == 42);
    }
}
