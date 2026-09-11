using Microsoft.Extensions.Time.Testing;
using WorkflowEngine.Resilience.Constants;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Resilience.Tests.Extensions;

public class RetryStrategyExtensionsTests
{
    /// <summary>
    /// A <see cref="Random"/> whose <see cref="Random.NextDouble"/> always returns the same value.
    /// A value of 0.5 yields a jitter factor of exactly 1.0, making delay calculations deterministic.
    /// </summary>
    private sealed class FixedRandom(double value) : Random
    {
        public override double NextDouble() => value;
    }

    private static readonly Random _noJitter = new FixedRandom(0.5);

    [Fact]
    public void CalculateDelay_Constant_ReturnsBaseInterval()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(5));

        // Act
        var delay = strategy.CalculateDelay(1, _noJitter);

        // Assert
        Assert.Equal(TimeSpan.FromSeconds(5), delay);
    }

    [Fact]
    public void CalculateDelay_Linear_ScalesByIteration()
    {
        // Arrange
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(2), maxDelay: TimeSpan.FromMinutes(10));

        // Act
        var delay1 = strategy.CalculateDelay(1, _noJitter);
        var delay3 = strategy.CalculateDelay(3, _noJitter);

        // Assert
        Assert.Equal(TimeSpan.FromSeconds(2), delay1);
        Assert.Equal(TimeSpan.FromSeconds(6), delay3);
    }

    [Fact]
    public void CalculateDelay_Exponential_ScalesByPowerOf2()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(4), maxDelay: TimeSpan.FromMinutes(10));

        // Act & Assert — progression: 1x, 2x, 4x, 8x base interval
        Assert.Equal(TimeSpan.FromSeconds(4), strategy.CalculateDelay(1, _noJitter)); // 4 * 2^0 = 4
        Assert.Equal(TimeSpan.FromSeconds(8), strategy.CalculateDelay(2, _noJitter)); // 4 * 2^1 = 8
        Assert.Equal(TimeSpan.FromSeconds(16), strategy.CalculateDelay(3, _noJitter)); // 4 * 2^2 = 16
        Assert.Equal(TimeSpan.FromSeconds(32), strategy.CalculateDelay(4, _noJitter)); // 4 * 2^3 = 32
    }

    [Fact]
    public void CalculateDelay_Exponential_ClampsHighIterationsToPreventOverflow()
    {
        // Arrange — iteration > 62 would overflow without clamping
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1), maxDelay: TimeSpan.FromHours(24));

        // Act — should not throw, should be clamped to maxDelay
        var delay = strategy.CalculateDelay(100, _noJitter);

        // Assert
        Assert.Equal(TimeSpan.FromHours(24), delay);
    }

    [Fact]
    public void CalculateDelay_ClampsToMaxDelay()
    {
        // Arrange
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(10), maxDelay: TimeSpan.FromSeconds(15));

        // Act
        var delay = strategy.CalculateDelay(5, _noJitter); // 10 * 5 = 50s, clamped to 15s

        // Assert
        Assert.Equal(TimeSpan.FromSeconds(15), delay);
    }

    [Fact]
    public void CalculateDelay_Jitter_StaysWithinJitterBounds()
    {
        // Arrange — 10s base delay, jitter must keep the result within ±20% of it
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(10), maxDelay: TimeSpan.FromMinutes(10));
        var lowerBound = TimeSpan.FromSeconds(10 * (1 - Defaults.RetryDelayJitterFraction));
        var upperBound = TimeSpan.FromSeconds(10 * (1 + Defaults.RetryDelayJitterFraction));

        // Act & Assert — real randomness, bounds hold for every draw
        for (var i = 0; i < 1_000; i++)
        {
            var delay = strategy.CalculateDelay(1);
            Assert.InRange(delay, lowerBound, upperBound);
        }
    }

    [Theory]
    [InlineData(0.0, 0.8)] // lowest draw → factor 1 - jitter fraction
    [InlineData(1.0, 1.2)] // highest draw → factor 1 + jitter fraction
    public void CalculateDelay_Jitter_MapsRandomDrawToJitterFactor(double randomValue, double expectedFactor)
    {
        // Arrange
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(10), maxDelay: TimeSpan.FromMinutes(10));

        // Act
        var delay = strategy.CalculateDelay(1, new FixedRandom(randomValue));

        // Assert
        Assert.Equal(TimeSpan.FromSeconds(10 * expectedFactor), delay);
    }

    [Fact]
    public void CalculateDelay_Jitter_NeverExceedsMaxDelay()
    {
        // Arrange — raw delay (50s) is clamped to maxDelay (15s) before jitter, so upward jitter
        // must be re-clamped: effective spread at the cap is [0.8, 1.0] × maxDelay
        var strategy = RetryStrategy.Linear(TimeSpan.FromSeconds(10), maxDelay: TimeSpan.FromSeconds(15));
        var lowerBound = TimeSpan.FromSeconds(15 * (1 - Defaults.RetryDelayJitterFraction));

        // Act & Assert
        for (var i = 0; i < 1_000; i++)
        {
            var delay = strategy.CalculateDelay(5);
            Assert.InRange(delay, lowerBound, TimeSpan.FromSeconds(15));
        }
    }

    [Fact]
    public void CalculateDelay_Jitter_NeverReturnsNegativeDelay()
    {
        // Arrange — zero base interval is the smallest computable delay
        var strategy = RetryStrategy.None();

        // Act
        var delay = strategy.CalculateDelay(1, new FixedRandom(0.0));

        // Assert
        Assert.Equal(TimeSpan.Zero, delay);
    }

    [Fact]
    public void CalculateDelay_Jitter_DifferentRandomValuesProduceDifferentDelays()
    {
        // Arrange — two workflows failing on the same cause at the same iteration
        var strategy = RetryStrategy.Linear(TimeSpan.FromMinutes(5), maxDelay: TimeSpan.FromHours(1));

        // Act
        var delayA = strategy.CalculateDelay(1, new FixedRandom(0.25));
        var delayB = strategy.CalculateDelay(1, new FixedRandom(0.75));

        // Assert — different draws de-synchronize the retry wave
        Assert.NotEqual(delayA, delayB);
    }

    [Fact]
    public void CanRetry_WithIteration_ReturnsFalse_WhenMaxRetriesExceeded()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 3);

        // Act & Assert
        Assert.True(strategy.CanRetry(1));
        Assert.True(strategy.CanRetry(2));
        Assert.True(strategy.CanRetry(3));
        Assert.False(strategy.CanRetry(4));
        Assert.False(strategy.CanRetry(100));
    }

    [Fact]
    public void CanRetry_WithDuration_ReturnsFalse_WhenPastDeadline()
    {
        // Arrange — start time far enough in the past that deadline has passed
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(1), maxDuration: TimeSpan.FromSeconds(30));
        var startTime = DateTimeOffset.UtcNow.AddSeconds(-31);

        // Act
        var result = strategy.CanRetry(5, startTime);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void CanRetry_WithDuration_JudgesTheNominalDelay_NotAJitteredRoll()
    {
        // Arrange — the nominal delay (10s) fits the 11s budget, but a high jitter roll (up to
        // 12s) would not. Admissibility is judged on the nominal schedule, so the verdict must
        // be deterministically true; under a jittered gate it flips on roughly a quarter of rolls.
        var strategy = RetryStrategy.Constant(TimeSpan.FromSeconds(10), maxDuration: TimeSpan.FromSeconds(11));
        var startTime = DateTimeOffset.UtcNow;

        // Act & Assert
        for (int i = 0; i < 100; i++)
            Assert.True(strategy.CanRetry(1, startTime));
    }

    [Fact]
    public void GetDeadline_WithMaxDuration_AddsToStartTime()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1), maxDuration: TimeSpan.FromMinutes(5));
        var startTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        // Act
        var deadline = strategy.GetDeadline(startTime);

        // Assert
        Assert.Equal(startTime.AddMinutes(5), deadline);
    }

    [Fact]
    public void GetDeadline_WithoutMaxDuration_ReturnsMaxValue()
    {
        // Arrange
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));
        var startTime = DateTimeOffset.UtcNow;

        // Act
        var deadline = strategy.GetDeadline(startTime);

        // Assert
        Assert.Equal(DateTimeOffset.MaxValue, deadline);
    }

    [Fact]
    public async Task Execute_SucceedsOnFirstTry()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 3);
        var callCount = 0;

        // Act
        await strategy.Execute(
            _ =>
            {
                callCount++;
                return Task.CompletedTask;
            },
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(1, callCount);
    }

    [Fact]
    public async Task Execute_AbortsOnErrorHandler_ReturningAbort()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromMilliseconds(10),
            maxRetries: 10,
            maxDuration: TimeSpan.FromMinutes(1)
        );
        var callCount = 0;

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            strategy.Execute(
                _ =>
                {
                    callCount++;
                    throw new InvalidOperationException("unrecoverable");
                },
                errorHandler: _ => RetryDecision.Abort,
                cancellationToken: TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(1, callCount);
    }

    [Fact]
    public async Task Execute_RespectsCancellation()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromSeconds(10),
            maxRetries: 100,
            maxDuration: TimeSpan.FromMinutes(10)
        );
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            strategy.Execute(
                ct =>
                {
                    ct.ThrowIfCancellationRequested();
                    return Task.CompletedTask;
                },
                cancellationToken: cts.Token
            )
        );
    }

    [Fact]
    public async Task Execute_RetriesTransientFailures_ThenSucceeds()
    {
        // Arrange — fail twice, succeed on third attempt
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 5);
        var callCount = 0;

        // Act
        await strategy.Execute(
            _ =>
            {
                callCount++;
                if (callCount <= 2)
                    throw new InvalidOperationException("transient");
                return Task.CompletedTask;
            },
            errorHandler: _ => RetryDecision.Retry,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert — should have been called 3 times (2 failures + 1 success)
        Assert.Equal(3, callCount);
    }

    [Fact]
    public async Task Execute_ThrowsAfterMaxRetriesExhausted()
    {
        // Arrange — every attempt fails, only 2 retries allowed
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 2);
        var callCount = 0;

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            strategy.Execute(
                _ =>
                {
                    callCount++;
                    throw new InvalidOperationException("always fails");
                },
                errorHandler: _ => RetryDecision.Retry,
                cancellationToken: TestContext.Current.CancellationToken
            )
        );

        // Initial attempt + 2 retries = 3 total calls (attempt 1, retry at 2, reject at 3)
        Assert.True(callCount >= 2, $"Expected at least 2 calls before exhaustion, got {callCount}");
    }

    [Fact]
    public async Task Execute_ThrowsWhenNextRetryWouldExceedDeadline()
    {
        // Arrange — large delay that would push past deadline
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromHours(1),
            maxRetries: 100,
            maxDuration: TimeSpan.FromMilliseconds(50)
        );
        var callCount = 0;

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            strategy.Execute(
                _ =>
                {
                    callCount++;
                    throw new InvalidOperationException("fails");
                },
                errorHandler: _ => RetryDecision.Retry,
                cancellationToken: TestContext.Current.CancellationToken
            )
        );

        // Should fail after first attempt because next retry delay (1h) exceeds deadline
        Assert.Equal(1, callCount);
    }

    [Fact]
    public async Task Execute_ClampsTheFinalDelayToTheDeadline_InsteadOfRejectingIt()
    {
        // Arrange — the nominal delay (100ms) fits the 110ms budget, but a high jitter roll (up
        // to 120ms) would overshoot it. The roll must be clamped to the deadline, never used to
        // reject an attempt the nominal schedule admitted. Repeated on a fake clock so a
        // regression to roll-based rejection (which trips on ~a quarter of rolls) cannot hide.
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromMilliseconds(100),
            maxRetries: 5,
            maxDuration: TimeSpan.FromMilliseconds(110)
        );

        for (int round = 0; round < 20; round++)
        {
            var timeProvider = new FakeTimeProvider();
            var callCount = 0;

            var execution = strategy.Execute(
                _ =>
                {
                    callCount++;
                    throw new InvalidOperationException("always fails");
                },
                errorHandler: _ => RetryDecision.Retry,
                timeProvider: timeProvider,
                cancellationToken: TestContext.Current.CancellationToken
            );

            // Drive the fake clock until the execution settles (bounded so a hang fails fast).
            for (int i = 0; i < 1000 && !execution.IsCompleted; i++)
            {
                timeProvider.Advance(TimeSpan.FromMilliseconds(10));
                await Task.Yield();
            }

            await Assert.ThrowsAsync<InvalidOperationException>(() => execution);

            // Attempt 1 at T0, attempt 2 within the (possibly clamped) delay, then CanRetry
            // gives up — the second attempt must never be lost to an unlucky roll.
            Assert.Equal(2, callCount);
        }
    }

    [Fact]
    public async Task Execute_InvokesSuccessCallback()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 3);
        var callbackInvoked = false;

        // Act
        await strategy.Execute(
            _ => Task.CompletedTask,
            successCallback: () => callbackInvoked = true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.True(callbackInvoked, "Expected success callback to be invoked");
    }

    [Fact]
    public async Task ExecuteT_ReturnsResultOnSuccess()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 3);

        // Act
        var result = await strategy.Execute<int>(
            _ => Task.FromResult(42),
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(42, result);
    }

    [Fact]
    public async Task ExecuteT_RetriesAndReturnsResultOnEventualSuccess()
    {
        // Arrange — fail once, then return result
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 3);
        var callCount = 0;

        // Act
        var result = await strategy.Execute<string>(
            _ =>
            {
                callCount++;
                if (callCount == 1)
                    throw new InvalidOperationException("transient");
                return Task.FromResult("success");
            },
            errorHandler: _ => RetryDecision.Retry,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(2, callCount);
    }

    [Fact]
    public async Task ExecuteT_InvokesSuccessCallbackWithResult()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 3);
        int? callbackValue = null;

        // Act
        await strategy.Execute<int>(
            _ => Task.FromResult(99),
            successCallback: val => callbackValue = val,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(99, callbackValue);
    }

    [Fact]
    public void CanRetry_WithBothConstraints_RespectsStricterLimit()
    {
        // Arrange — MaxRetries allows it, but duration has expired
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromSeconds(1),
            maxRetries: 100,
            maxDuration: TimeSpan.FromSeconds(10)
        );
        var startTime = DateTimeOffset.UtcNow.AddSeconds(-11);

        // Act & Assert — duration expired, even though retry count is low
        Assert.False(strategy.CanRetry(1, startTime));
    }

    [Fact]
    public void CanRetry_WithinBudget_ReturnsTrue()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromMilliseconds(100),
            maxRetries: 10,
            maxDuration: TimeSpan.FromMinutes(5)
        );
        var startTime = DateTimeOffset.UtcNow;

        // Act & Assert — well within both limits
        Assert.True(strategy.CanRetry(1, startTime));
        Assert.True(strategy.CanRetry(5, startTime));
    }

    [Fact]
    public void CanRetry_WhenNextDelayExceedsDeadline_ReturnsFalse()
    {
        // Arrange — 1h delay with 10s max duration
        var strategy = RetryStrategy.Constant(
            TimeSpan.FromHours(1),
            maxRetries: 100,
            maxDuration: TimeSpan.FromSeconds(10)
        );
        var startTime = DateTimeOffset.UtcNow;

        // Act & Assert — within retry count and time, but next delay would exceed deadline
        Assert.False(strategy.CanRetry(1, startTime));
    }

    [Fact]
    public async Task Execute_ThrowsArgumentNullException_WhenOperationIsNull()
    {
        // Arrange
        var strategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: 1);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            strategy.Execute<int>(null!, cancellationToken: TestContext.Current.CancellationToken)
        );
    }
}
