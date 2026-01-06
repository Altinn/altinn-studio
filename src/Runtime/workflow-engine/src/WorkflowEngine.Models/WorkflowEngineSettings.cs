using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Settings for the Process Engine.
/// </summary>
public sealed record WorkflowEngineSettings
{
    /// <summary>
    /// The API key used to authenticate requests from the App to the Process Engine and from the Process Engine back to the App.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public string? ApiKey { get; set; }

    /// <summary>
    /// The total number of concurrent tasks that can be processed by the engine.
    /// </summary>
    [JsonPropertyName("queueCapacity")]
    public int? QueueCapacity { get; set; }

    /// <summary>
    /// The default timeout for task execution.
    /// </summary>
    [JsonPropertyName("defaultTaskExecutionTimeout")]
    public TimeSpan? DefaultTaskExecutionTimeout { get; set; }

    /// <summary>
    /// The default retry strategy for tasks.
    /// </summary>
    [JsonPropertyName("defaultTaskRetryStrategy")]
    public RetryStrategy? DefaultTaskRetryStrategy { get; set; }

    /// <summary>
    /// The retry strategy for database operations.
    /// </summary>
    [JsonPropertyName("databaseRetryStrategy")]
    public RetryStrategy? DatabaseRetryStrategy { get; set; }

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports all properties from <see cref="InstanceInformation"/>.
    /// </summary>
    [JsonPropertyName("appCommandEndpoint")]
    public string? AppCommandEndpoint { get; set; }
}
