using System.Text.Json;
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

    [Fact]
    public void Exponential_WithNonRetryableHttpStatusCodes_SetsProperty()
    {
        // Act
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [400, 404, 422]);

        // Assert
        Assert.NotNull(strategy.NonRetryableHttpStatusCodes);
        Assert.Equal([400, 404, 422], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Linear_WithNonRetryableHttpStatusCodes_SetsProperty()
    {
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [401, 403]);

        Assert.NotNull(strategy.NonRetryableHttpStatusCodes);
        Assert.Equal([401, 403], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Constant_WithNonRetryableHttpStatusCodes_SetsProperty()
    {
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [400]);

        Assert.NotNull(strategy.NonRetryableHttpStatusCodes);
        Assert.Single(strategy.NonRetryableHttpStatusCodes);
        Assert.Equal(400, strategy.NonRetryableHttpStatusCodes[0]);
    }

    [Fact]
    public void Fixed_WithNonRetryableHttpStatusCodes_SetsProperty()
    {
        var strategy = RetryStrategy.Fixed(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [400, 422]);

        Assert.NotNull(strategy.NonRetryableHttpStatusCodes);
        Assert.Equal([400, 422], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void NonRetryableHttpStatusCodes_RoundTrips_ThroughJsonSerialization()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(
            TimeSpan.FromSeconds(1),
            maxDelay: TimeSpan.FromMinutes(1),
            nonRetryableHttpStatusCodes: [400, 401, 403, 404, 422]
        );

        // Act
        string json = JsonSerializer.Serialize(strategy);
        RetryStrategy? deserialized = JsonSerializer.Deserialize<RetryStrategy>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.NotNull(deserialized.NonRetryableHttpStatusCodes);
        Assert.Equal([400, 401, 403, 404, 422], deserialized.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void DefaultNonRetryableHttpStatusCodes_ContainsExpectedCodes()
    {
        Assert.Contains(400, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
        Assert.Contains(401, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
        Assert.Contains(403, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
        Assert.Contains(404, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
        Assert.Contains(422, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
        Assert.DoesNotContain(500, RetryStrategy.DefaultNonRetryableHttpStatusCodes);
    }
}
