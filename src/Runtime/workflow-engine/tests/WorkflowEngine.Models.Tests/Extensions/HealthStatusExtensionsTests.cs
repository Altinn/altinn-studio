using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Models.Tests.Extensions;

public class HealthStatusExtensionsTests
{
    [Theory]
    [InlineData(EngineHealthStatus.Disabled | EngineHealthStatus.Running, true)]
    [InlineData(EngineHealthStatus.Running | EngineHealthStatus.Healthy, false)]
    public void IsDisabled_ReturnsExpected(EngineHealthStatus status, bool expected)
    {
        // Act & Assert
        Assert.Equal(expected, status.IsDisabled());
    }

    [Theory]
    [InlineData(EngineHealthStatus.Running | EngineHealthStatus.Healthy, true)]
    [InlineData(EngineHealthStatus.Running | EngineHealthStatus.Unhealthy, false)]
    [InlineData(EngineHealthStatus.Stopped, false)]
    public void IsHealthy_ReturnsExpected(EngineHealthStatus status, bool expected)
    {
        // Act & Assert
        Assert.Equal(expected, status.IsHealthy());
    }

    [Theory]
    [InlineData(EngineHealthStatus.Running | EngineHealthStatus.QueueFull, true)]
    [InlineData(EngineHealthStatus.Running | EngineHealthStatus.Healthy, false)]
    public void HasFullQueue_ReturnsExpected(EngineHealthStatus status, bool expected)
    {
        // Act & Assert
        Assert.Equal(expected, status.HasFullQueue());
    }
}
