using Microsoft.Extensions.Diagnostics.HealthChecks;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core.Tests;

public class EngineHealthCheckTests
{
    private const EngineHealthStatus UnhealthyMask = EngineHealthStatus.Unhealthy | EngineHealthStatus.Stopped;

    private const EngineHealthStatus DegradedMask =
        EngineHealthStatus.Disabled | EngineHealthStatus.QueueFull | EngineHealthStatus.DatabaseUnavailable;

    private static EngineHealthLevel DeriveHealthLevel(EngineHealthStatus status)
    {
        if ((status & UnhealthyMask) != 0)
            return EngineHealthLevel.Unhealthy;
        if ((status & DegradedMask) != 0)
            return EngineHealthLevel.Degraded;
        return EngineHealthLevel.Healthy;
    }

    private static (EngineHealthCheck HealthCheck, Mock<IEngineStatus> StatusMock) CreateHealthCheck(
        EngineHealthStatus status,
        int activeWorkerCount = 0,
        int maxWorkers = 300,
        int activeWorkflowCount = 0,
        int scheduledWorkflowCount = 0,
        int failedWorkflowCount = 0
    )
    {
        var statusMock = new Mock<IEngineStatus>();
        statusMock.Setup(e => e.Status).Returns(status);
        statusMock.Setup(e => e.HealthLevel).Returns(DeriveHealthLevel(status));
        statusMock.Setup(e => e.ActiveWorkerCount).Returns(activeWorkerCount);
        statusMock.Setup(e => e.MaxWorkers).Returns(maxWorkers);
        statusMock.Setup(e => e.ActiveWorkflowCount).Returns(activeWorkflowCount);
        statusMock.Setup(e => e.ScheduledWorkflowCount).Returns(scheduledWorkflowCount);
        statusMock.Setup(e => e.FailedWorkflowCount).Returns(failedWorkflowCount);
        var concurrencyLimiterMock = new Mock<IConcurrencyLimiter>();
        concurrencyLimiterMock.Setup(x => x.DbSlotStatus).Returns(new ConcurrencyLimiter.SlotStatus(50, 50, 100));
        concurrencyLimiterMock.Setup(x => x.HttpSlotStatus).Returns(new ConcurrencyLimiter.SlotStatus(50, 50, 100));

        return (new EngineHealthCheck(statusMock.Object, concurrencyLimiterMock.Object), statusMock);
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
    public async Task CheckHealthAsync_IncludesStatusAndWorkerCountInData()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(
            EngineHealthStatus.Healthy | EngineHealthStatus.Running,
            activeWorkerCount: 42,
            maxWorkers: 300
        );

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.NotNull(result.Data);
        Assert.Equal("Healthy, Running", result.Data["status"]);
        Assert.True(result.Data["workers"] is Dictionary<string, int> dict && dict["active"] == 42);
    }

    [Fact]
    public async Task CheckHealthAsync_IncludesQueueDataInResponse()
    {
        // Arrange
        var (healthCheck, _) = CreateHealthCheck(
            EngineHealthStatus.Healthy | EngineHealthStatus.Running,
            activeWorkflowCount: 15,
            scheduledWorkflowCount: 7,
            failedWorkflowCount: 3
        );

        // Act
        var result = await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.NotNull(result.Data);
        var queue = Assert.IsType<Dictionary<string, int>>(result.Data["queue"]);
        Assert.Equal(15, queue["active_workflows"]);
        Assert.Equal(7, queue["scheduled_workflows"]);
        Assert.Equal(3, queue["failed_workflows"]);
    }
}
