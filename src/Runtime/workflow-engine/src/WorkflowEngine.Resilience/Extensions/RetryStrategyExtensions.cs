using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Resilience.Models;

// CA2208: Instantiate argument exceptions correctly
// S3928: Parameter names used into ArgumentException constructors should match an existing one
#pragma warning disable S3928
#pragma warning disable CA2208

namespace WorkflowEngine.Resilience.Extensions;

public static class RetryStrategyExtensions
{
    extension(RetryStrategy strategy)
    {
        /// <summary>
        /// Determines whether another retry can be attempted based on the current iteration vs. max retries.
        /// </summary>
        public bool CanRetry(int iteration)
        {
            if (strategy.MaxRetries < iteration)
                return false;

            return true;
        }

        /// <summary>
        /// Determines whether another retry can be attempted based on the current iteration vs. max retries
        /// and the elapsed time vs. max duration.
        /// </summary>
        public bool CanRetry(int iteration, DateTimeOffset initialStartTime, TimeProvider? timeProvider = null)
        {
            if (!strategy.CanRetry(iteration))
                return false;

            DateTimeOffset now = timeProvider?.GetUtcNow() ?? DateTimeOffset.UtcNow;
            DateTimeOffset deadline = strategy.GetDeadline(initialStartTime);

            if (now >= deadline)
                return false;

            TimeSpan delay = strategy.CalculateDelay(iteration);
            DateTimeOffset nextRun = now.Add(delay);

            if (nextRun >= deadline)
                return false;

            return true;
        }

        /// <summary>
        /// Calculates the deadline for retries based on the strategy's max duration.
        /// If the max duration is not specified, this operation returns <see cref="DateTimeOffset.MaxValue"/>.
        /// </summary>
        public DateTimeOffset GetDeadline(DateTimeOffset initialStartTime)
        {
            if (!strategy.MaxDuration.HasValue)
                return DateTimeOffset.MaxValue;

            return initialStartTime.Add(strategy.MaxDuration.Value);
        }

        /// <summary>
        /// Calculates the delay before the next retry attempt based on the backoff strategy.
        /// </summary>
        public TimeSpan CalculateDelay(int iteration)
        {
            var maxDelaySeconds = strategy.MaxDelay?.TotalSeconds ?? TimeSpan.MaxValue.TotalSeconds;

            var delaySeconds = strategy.BackoffType switch
            {
                BackoffType.Constant => strategy.BaseInterval.TotalSeconds,
                BackoffType.Linear => strategy.BaseInterval.TotalSeconds * iteration,
                BackoffType.Exponential => strategy.BaseInterval.TotalSeconds
                    * Math.Pow(2, Math.Min(iteration - 1, 62)),
                _ => throw new ArgumentOutOfRangeException(nameof(strategy), strategy, null),
            };

            return TimeSpan.FromSeconds(Math.Min(delaySeconds, maxDelaySeconds));
        }

        /// <summary>
        /// Executes the provided operation with retries based on the strategy. Ignores the result of the operation.
        /// </summary>
        public async Task Execute(
            Func<CancellationToken, Task> operation,
            Action? successCallback = null,
            Func<Exception, RetryDecision>? errorHandler = null,
            TimeProvider? timeProvider = null,
            ILogger? logger = null,
            CancellationToken cancellationToken = default,
            [CallerMemberName] string operationName = ""
        ) =>
            await strategy.Execute<object?>(
                async ct =>
                {
                    await operation(ct);
                    return null;
                },
                (_) => successCallback?.Invoke(),
                errorHandler,
                timeProvider,
                logger,
                cancellationToken,
                operationName
            );

        /// <summary>
        /// Executes the provided operation with retries based on the strategy. Returns the result of the operation.
        /// </summary>
        public async Task<T> Execute<T>(
            Func<CancellationToken, Task<T>> operation,
            Action<T?>? successCallback = null,
            Func<Exception, RetryDecision>? errorHandler = null,
            TimeProvider? timeProvider = null,
            ILogger? logger = null,
            CancellationToken cancellationToken = default,
            [CallerMemberName] string operationName = ""
        )
        {
            logger?.StartingExecution(operationName);
            ArgumentNullException.ThrowIfNull(operation);
            timeProvider ??= TimeProvider.System;

            int attempt = 1;
            DateTimeOffset startTime = timeProvider.GetUtcNow();

            while (true)
            {
                try
                {
                    var result = await operation(cancellationToken);
                    successCallback?.Invoke(result);
                    logger?.ExecutionSucceeded(operationName, attempt);

                    return result;
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    if (errorHandler?.Invoke(ex) is RetryDecision.Abort)
                    {
                        logger?.ExecutionFailed(operationName, attempt, ex.Message, ex);
                        logger?.UnrecoverableError(ex.GetType().Name, ex);
                        throw;
                    }

                    if (!strategy.CanRetry(attempt, startTime, timeProvider))
                    {
                        logger?.ExecutionFailed(operationName, attempt, ex.Message, ex);
                        logger?.MaxRetriesReached(ex);
                        throw;
                    }

                    TimeSpan delay = strategy.CalculateDelay(attempt);
                    DateTimeOffset deadline = strategy.GetDeadline(startTime);
                    DateTimeOffset now = timeProvider.GetUtcNow();
                    if (now.Add(delay) >= deadline)
                    {
                        logger?.ExecutionFailed(operationName, attempt, ex.Message, ex);
                        logger?.NextRetryUnreachable(ex);
                        throw;
                    }

                    logger?.RetryDelay(
                        operationName,
                        attempt,
                        strategy.MaxRetries ?? int.MaxValue,
                        delay.TotalMilliseconds,
                        ex
                    );

                    await Task.Delay(delay, timeProvider, cancellationToken);
                    attempt++;
                }
            }
        }
    }
}

public static partial class RetryStrategyExtensionsLogging
{
    [LoggerMessage(LogLevel.Debug, "Starting execution of operation '{OperationName}'")]
    public static partial void StartingExecution(this ILogger logger, string operationName);

    [LoggerMessage(LogLevel.Debug, "Operation '{OperationName}' succeeded on attempt {Attempt}")]
    public static partial void ExecutionSucceeded(this ILogger logger, string operationName, int attempt);

    [LoggerMessage(
        LogLevel.Error,
        "Operation '{OperationName}' failed with error on attempt {Attempt}: {ErrorMessage}"
    )]
    public static partial void ExecutionFailed(
        this ILogger logger,
        string operationName,
        int attempt,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Error {ErrorType} is unrecoverable, giving up")]
    public static partial void UnrecoverableError(this ILogger logger, string errorType, Exception ex);

    [LoggerMessage(
        LogLevel.Error,
        "All available retries are exhausted or the deadline for this operation has been exceeded, giving up"
    )]
    public static partial void MaxRetriesReached(this ILogger logger, Exception ex);

    [LoggerMessage(
        LogLevel.Error,
        "The next retry attempt is unreachable because it will exceed the deadline for this operation, giving up"
    )]
    public static partial void NextRetryUnreachable(this ILogger logger, Exception ex);

    [LoggerMessage(
        LogLevel.Warning,
        "Operation '{OperationName}' failed on attempt {Attempt} of {MaxAttempts}, retrying in {Delay}ms"
    )]
    public static partial void RetryDelay(
        this ILogger logger,
        string operationName,
        int attempt,
        int maxAttempts,
        double delay,
        Exception ex
    );
}
