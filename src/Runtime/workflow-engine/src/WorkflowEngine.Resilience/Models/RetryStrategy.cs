using System.Text.Json.Serialization;

namespace WorkflowEngine.Resilience.Models;

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

    /// <summary>
    /// The maximum allowed processing time, across all retries.
    /// </summary>
    [JsonPropertyName("maxDuration")]
    public TimeSpan? MaxDuration { get; init; }

    // TODO: Consider adding jitter option

    /// <summary>
    /// HTTP status codes that should not be retried. When a response has one of these status codes,
    /// the step fails immediately as a <see cref="Models.BackoffType"/> CriticalError instead of retrying.
    /// </summary>
    [JsonPropertyName("nonRetryableHttpStatusCodes")]
    public IReadOnlyList<int>? NonRetryableHttpStatusCodes { get; init; }

    /// <summary>
    /// The default set of HTTP status codes that should not be retried.
    /// Includes 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity.
    /// Notably absent: 408 (timeout, transient), 409 (conflict, may resolve), 429 (rate limit, retry after cooldown).
    /// </summary>
    public static readonly IReadOnlyList<int> DefaultNonRetryableHttpStatusCodes = [400, 401, 403, 404, 422];

    /// <summary>
    /// Creates an exponential backoff retry strategy.
    /// </summary>
    public static RetryStrategy Exponential(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = BackoffType.Exponential,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
        };

    /// <summary>
    /// Creates a linear backoff retry strategy.
    /// </summary>
    public static RetryStrategy Linear(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = BackoffType.Linear,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
        };

    /// <summary>
    /// Creates a constant backoff retry strategy.
    /// </summary>
    public static RetryStrategy Constant(
        TimeSpan interval,
        int? maxRetries = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = BackoffType.Constant,
            BaseInterval = interval,
            MaxRetries = maxRetries,
            MaxDelay = interval,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
        };

    /// <summary>
    /// Alias for <see cref="Constant"/>
    /// </summary>
    public static RetryStrategy Fixed(
        TimeSpan intervalDelay,
        int? maxRetries = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) => Constant(intervalDelay, maxRetries, maxDuration, nonRetryableHttpStatusCodes);

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
