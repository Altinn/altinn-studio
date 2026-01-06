using System.Text.Json.Serialization;

namespace WorkflowEngine.Resilience;

/// <summary>
/// Defines a retry strategy for process engine tasks.
/// </summary>
public sealed record RetryStrategy
{
    /// <summary>
    /// The type of backoff to use.
    /// </summary>
    [JsonPropertyName("backoffType")]
    public BackoffType BackoffType { get; init; }

    /// <summary>
    /// The base interval between attempts. The actual delay grows or stays constant based on the backoff type.
    /// </summary>
    [JsonPropertyName("baseInterval")]
    public TimeSpan BaseInterval { get; init; }

    /// <summary>
    /// The maximum allowed number of retries before giving up.
    /// </summary>
    [JsonPropertyName("maxRetries")]
    public int? MaxRetries { get; init; }

    /// <summary>
    /// The maximum allowed delay between retries. Useful for linear and exponential types.
    /// </summary>
    [JsonPropertyName("maxDelay")]
    public TimeSpan? MaxDelay { get; init; }

    // TODO: Consider adding jitter option
    // TODO: Consider adding short-circuit option (avoid retrying on certain error codes)

    /// <summary>
    /// Creates an exponential backoff retry strategy.
    /// </summary>
    public static RetryStrategy Exponential(TimeSpan baseInterval, int? maxRetries = null, TimeSpan? maxDelay = null) =>
        new()
        {
            BackoffType = BackoffType.Exponential,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
        };

    /// <summary>
    /// Creates a linear backoff retry strategy.
    /// </summary>
    public static RetryStrategy Linear(TimeSpan baseInterval, int? maxRetries = null, TimeSpan? maxDelay = null) =>
        new()
        {
            BackoffType = BackoffType.Linear,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
        };

    /// <summary>
    /// Creates a constant backoff retry strategy.
    /// </summary>
    public static RetryStrategy Constant(TimeSpan interval, int? maxRetries = null) =>
        new()
        {
            BackoffType = BackoffType.Constant,
            BaseInterval = interval,
            MaxRetries = maxRetries,
            MaxDelay = interval,
        };

    /// <summary>
    /// Alias for <see cref="Constant"/>
    /// </summary>
    public static RetryStrategy Fixed(TimeSpan intervalDelay, int? maxRetries = null) =>
        Constant(intervalDelay, maxRetries);

    /// <summary>
    /// Creates a retry strategy with no retries.
    /// </summary>
    public static RetryStrategy None() =>
        new()
        {
            BackoffType = BackoffType.Constant,
            BaseInterval = TimeSpan.Zero,
            MaxRetries = 0,
            MaxDelay = TimeSpan.Zero,
        };
}
