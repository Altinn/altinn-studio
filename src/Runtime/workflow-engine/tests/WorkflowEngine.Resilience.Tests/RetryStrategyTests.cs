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

    // === NonRetryableHttpStatusCodes Tests ===

    [Fact]
    public void DefaultNonRetryableHttpStatusCodes_ContainsExpectedCodes()
    {
        // Assert
        Assert.Equal([400, 401, 403, 404, 422], RetryStrategy.DefaultNonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Exponential_WithNonRetryableHttpStatusCodes_IncludesCodes()
    {
        // Act
        var strategy = RetryStrategy.Exponential(
            TimeSpan.FromSeconds(1),
            nonRetryableHttpStatusCodes: RetryStrategy.DefaultNonRetryableHttpStatusCodes
        );

        // Assert
        Assert.Equal(RetryStrategy.DefaultNonRetryableHttpStatusCodes, strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Linear_WithNonRetryableHttpStatusCodes_IncludesCodes()
    {
        // Act
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [404, 422]);

        // Assert
        Assert.Equal([404, 422], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Constant_WithNonRetryableHttpStatusCodes_IncludesCodes()
    {
        // Act
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [400]);

        // Assert
        Assert.Equal([400], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void Fixed_WithNonRetryableHttpStatusCodes_IncludesCodes()
    {
        // Act
        var strategy = RetryStrategy.Fixed(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [403, 422]);

        // Assert
        Assert.Equal([403, 422], strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void NonRetryableHttpStatusCodes_IsNullByDefault()
    {
        // Act
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Assert
        Assert.Null(strategy.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void NonRetryableHttpStatusCodes_JsonRoundTrip()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(
            TimeSpan.FromSeconds(2),
            maxRetries: 3,
            nonRetryableHttpStatusCodes: [400, 404, 422]
        );

        // Act
        var json = JsonSerializer.Serialize(strategy);
        var deserialized = JsonSerializer.Deserialize<RetryStrategy>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(strategy.BackoffType, deserialized.BackoffType);
        Assert.Equal(strategy.BaseInterval, deserialized.BaseInterval);
        Assert.Equal(strategy.MaxRetries, deserialized.MaxRetries);
        Assert.Equal([400, 404, 422], deserialized.NonRetryableHttpStatusCodes);
    }

    [Fact]
    public void NonRetryableHttpStatusCodes_NullProperty_JsonRoundTrip()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var json = JsonSerializer.Serialize(strategy);
        var deserialized = JsonSerializer.Deserialize<RetryStrategy>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Null(deserialized.NonRetryableHttpStatusCodes);
    }
}
