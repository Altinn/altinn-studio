using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Defines a retry strategy for process engine tasks.
/// </summary>
public sealed record ProcessEngineRetryStrategy
{
    /// <summary>
    /// The type of backoff to use.
    /// </summary>
    [JsonPropertyName("backoffType")]
    public ProcessEngineBackoffType BackoffType { get; init; }

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
    public static ProcessEngineRetryStrategy Exponential(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null
    ) =>
        new()
        {
            BackoffType = ProcessEngineBackoffType.Exponential,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
        };

    /// <summary>
    /// Creates a linear backoff retry strategy.
    /// </summary>
    public static ProcessEngineRetryStrategy Linear(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null
    ) =>
        new()
        {
            BackoffType = ProcessEngineBackoffType.Linear,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
        };

    /// <summary>
    /// Creates a constant backoff retry strategy.
    /// </summary>
    public static ProcessEngineRetryStrategy Constant(TimeSpan interval, int? maxRetries = null) =>
        new()
        {
            BackoffType = ProcessEngineBackoffType.Constant,
            BaseInterval = interval,
            MaxRetries = maxRetries,
            MaxDelay = interval,
        };

    /// <summary>
    /// Alias for <see cref="Constant"/>
    /// </summary>
    public static ProcessEngineRetryStrategy Fixed(TimeSpan intervalDelay, int? maxRetries = null) =>
        Constant(intervalDelay, maxRetries);

    /// <summary>
    /// Creates a retry strategy with no retries.
    /// </summary>
    public static ProcessEngineRetryStrategy None() =>
        new()
        {
            BackoffType = ProcessEngineBackoffType.Constant,
            BaseInterval = TimeSpan.Zero,
            MaxRetries = 0,
            MaxDelay = TimeSpan.Zero,
        };
}
