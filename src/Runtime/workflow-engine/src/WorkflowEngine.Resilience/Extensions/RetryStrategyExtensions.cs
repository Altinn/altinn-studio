using System.Diagnostics.CodeAnalysis;

namespace WorkflowEngine.Resilience.Extensions;

public static class RetryStrategyExtensions
{
    extension(RetryStrategy strategy)
    {
        public bool CanRetry(int iteration) => !strategy.MaxRetries.HasValue || strategy.MaxRetries > iteration;

        [SuppressMessage("Usage", "CA2208:Instantiate argument exceptions correctly")]
        [SuppressMessage(
            "Major Code Smell",
            "S3928:Parameter names used into ArgumentException constructors should match an existing one "
        )]
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
    }
}
