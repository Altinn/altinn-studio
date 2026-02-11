using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Resilience.Tests;

public class RetryStrategyTests
{
    [Fact]
    public void Exponential_CreatesStrategy_WithExpectedProperties()
    {
        // Act
        var strategy = RetryStrategy.Exponential(
            TimeSpan.FromSeconds(2),
            maxRetries: 5,
            maxDelay: TimeSpan.FromMinutes(1),
            maxDuration: TimeSpan.FromMinutes(10)
        );

        // Assert
        Assert.Equal(BackoffType.Exponential, strategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(2), strategy.BaseInterval);
        Assert.Equal(5, strategy.MaxRetries);
        Assert.Equal(TimeSpan.FromMinutes(1), strategy.MaxDelay);
        Assert.Equal(TimeSpan.FromMinutes(10), strategy.MaxDuration);
    }

    [Fact]
    public void Linear_CreatesStrategy_WithExpectedProperties()
    {
        // Act
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(3), maxRetries: 10);

        // Assert
        Assert.Equal(BackoffType.Linear, strategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(3), strategy.BaseInterval);
        Assert.Equal(10, strategy.MaxRetries);
    }

    [Fact]
    public void Constant_CreatesStrategy_WithMaxDelayEqualToInterval()
    {
        // Act
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3);

        // Assert
        Assert.Equal(BackoffType.Constant, strategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(5), strategy.BaseInterval);
        Assert.Equal(TimeSpan.FromSeconds(5), strategy.MaxDelay);
        Assert.Equal(3, strategy.MaxRetries);
    }

    [Fact]
    public void Fixed_IsAliasForConstant()
    {
        // Act
        var fixedStrategy = RetryStrategy.Fixed(TimeSpan.FromSeconds(5), maxRetries: 3);
        var constantStrategy = RetryStrategy.Constant(TimeSpan.FromSeconds(5), maxRetries: 3);

        // Assert
        Assert.Equal(constantStrategy, fixedStrategy);
    }

    [Fact]
    public void None_CreatesStrategy_WithZeroRetriesAndZeroInterval()
    {
        // Act
        var strategy = RetryStrategy.None();

        // Assert
        Assert.Equal(BackoffType.Constant, strategy.BackoffType);
        Assert.Equal(TimeSpan.Zero, strategy.BaseInterval);
        Assert.Equal(0, strategy.MaxRetries);
        Assert.Equal(TimeSpan.Zero, strategy.MaxDelay);
    }
}
