using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

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

    /// <summary>
    /// HTTP status codes that should not be retried. When an HTTP call returns one of these
    /// status codes, the step fails immediately instead of being requeued.
    /// </summary>
    [JsonPropertyName("nonRetryableHttpStatusCodes")]
    public IReadOnlyList<int>? NonRetryableHttpStatusCodes { get; init; }

    /// <summary>
    /// Default HTTP status codes that are considered non-retryable (client errors that won't succeed on retry).
    /// </summary>
    public static readonly IReadOnlyList<int> DefaultNonRetryableHttpStatusCodes = [400, 401, 403, 404, 405, 409, 422];

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
