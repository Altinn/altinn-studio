using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Resilience.Extensions;

public static class RetryStrategyExtensions
{
    extension(RetryStrategy strategy)
    {
        /// <summary>
        /// Determines whether another retry can be attempted based on the current iteration and the strategy's max retries.
        /// </summary>
        public bool CanRetry(int iteration) => !strategy.MaxRetries.HasValue || strategy.MaxRetries > iteration;

        /// <summary>
        /// Calculates the delay before the next retry attempt based on the backoff strategy.
        /// </summary>
        public TimeSpan CalculateDelay(int iteration)
        {
            var delay = strategy.BackoffType switch
            {
                BackoffType.Constant => strategy.BaseInterval,
                BackoffType.Linear => TimeSpan.FromSeconds((long)(strategy.BaseInterval.TotalSeconds * iteration)),
                BackoffType.Exponential => TimeSpan.FromSeconds(
                    strategy.BaseInterval.TotalSeconds * Math.Pow(2, iteration - 2)
                ),
                _ => throw new ArgumentOutOfRangeException(nameof(strategy), strategy, null),
            };

            return delay > strategy.MaxDelay ? strategy.MaxDelay.Value : delay;
        }

        /// <summary>
        /// Executes the provided operation with retries based on the strategy. Ignores the result of the operation.
        /// </summary>
        public async Task Execute(
            Func<CancellationToken, Task> operation,
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
            Func<Exception, RetryDecision>? errorHandler = null,
            TimeProvider? timeProvider = null,
            ILogger? logger = null,
            CancellationToken cancellationToken = default,
            [CallerMemberName] string operationName = ""
        )
        {
            var attempt = 1;
            timeProvider ??= TimeProvider.System;

            while (true)
            {
                try
                {
                    var result = await operation(cancellationToken);

                    if (attempt > 1)
                        logger?.SuccessfulExecution(operationName, attempt);

                    return result;
                }
                catch (Exception ex)
                {
                    logger?.FailedExecution(operationName, attempt, ex.Message, ex);

                    if (errorHandler?.Invoke(ex) is RetryDecision.Abort)
                    {
                        logger?.UnrecoverableError(ex.GetType().Name, ex);
                        throw;
                    }

                    if (!strategy.CanRetry(attempt))
                    {
                        logger?.MaxRetriesReached(ex);
                        throw;
                    }

                    var delay = strategy.CalculateDelay(attempt);

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
    [LoggerMessage(LogLevel.Debug, "Database operation '{OperationName}' succeeded on attempt {Attempt}")]
    public static partial void SuccessfulExecution(this ILogger logger, string operationName, int attempt);

    [LoggerMessage(
        LogLevel.Error,
        "Database operation '{OperationName}' failed with error on attempt {Attempt}: {ErrorMessage}"
    )]
    public static partial void FailedExecution(
        this ILogger logger,
        string operationName,
        int attempt,
        string errorMessage,
        Exception ex
    );

    [LoggerMessage(LogLevel.Error, "Error {ErrorType} is unrecoverable, giving up")]
    public static partial void UnrecoverableError(this ILogger logger, string errorType, Exception ex);

    [LoggerMessage(LogLevel.Error, "All available retries are exhausted, giving up")]
    public static partial void MaxRetriesReached(this ILogger logger, Exception ex);

    [LoggerMessage(
        LogLevel.Warning,
        "Database operation '{OperationName}' failed on attempt {Attempt} of {MaxAttempts}, retrying in {Delay}ms"
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
