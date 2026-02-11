using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class HealthStatusExtensionsTests
{
    [Fact]
    public void IsDisabled_ReturnsTrue_WhenDisabledFlagSet()
    {
        // Arrange
        var status = EngineHealthStatus.Disabled | EngineHealthStatus.Running;

        // Act
        var result = status.IsDisabled();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsDisabled_ReturnsFalse_WhenDisabledFlagNotSet()
    {
        // Arrange
        var status = EngineHealthStatus.Running | EngineHealthStatus.Healthy;

        // Act
        var result = status.IsDisabled();

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsHealthy_ReturnsTrue_WhenRunningWithoutUnhealthy()
    {
        // Arrange
        var status = EngineHealthStatus.Running | EngineHealthStatus.Healthy;

        // Act
        var result = status.IsHealthy();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsHealthy_ReturnsFalse_WhenRunningWithUnhealthy()
    {
        // Arrange
        var status = EngineHealthStatus.Running | EngineHealthStatus.Unhealthy;

        // Act
        var result = status.IsHealthy();

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsHealthy_ReturnsFalse_WhenNotRunning()
    {
        // Arrange
        var status = EngineHealthStatus.Stopped;

        // Act
        var result = status.IsHealthy();

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void HasFullQueue_ReturnsTrue_WhenQueueFullFlagSet()
    {
        // Arrange
        var status = EngineHealthStatus.Running | EngineHealthStatus.QueueFull;

        // Act
        var result = status.HasFullQueue();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void HasFullQueue_ReturnsFalse_WhenQueueFullFlagNotSet()
    {
        // Arrange
        var status = EngineHealthStatus.Running | EngineHealthStatus.Healthy;

        // Act
        var result = status.HasFullQueue();

        // Assert
        Assert.False(result);
    }
}
