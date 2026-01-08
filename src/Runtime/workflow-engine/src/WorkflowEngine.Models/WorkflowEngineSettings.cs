using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

/// <summary>
/// Settings for the Process Engine.
/// </summary>
public sealed record WorkflowEngineSettings
{
    /// <summary>
    /// The connection string used to connect to the database.
    /// </summary>
    [JsonPropertyName("databaseConnectionString")]
    public required string DatabaseConnectionString { get; set; }

    /// <summary>
    /// The API key used to authenticate requests from the App to the Process Engine and from the Process Engine back to the App.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public required string ApiKey { get; set; }

    /// <summary>
    /// The total number of concurrent tasks that can be processed by the engine.
    /// </summary>
    [JsonPropertyName("queueCapacity")]
    public required int QueueCapacity { get; set; }

    /// <summary>
    /// The default timeout for task execution.
    /// </summary>
    [JsonPropertyName("defaultTaskExecutionTimeout")]
    public required TimeSpan DefaultTaskExecutionTimeout { get; set; }

    /// <summary>
    /// The default retry strategy for tasks.
    /// </summary>
    [JsonPropertyName("defaultTaskRetryStrategy")]
    public required RetryStrategy DefaultTaskRetryStrategy { get; set; }

    /// <summary>
    /// The retry strategy for database operations.
    /// </summary>
    [JsonPropertyName("databaseRetryStrategy")]
    public required RetryStrategy DatabaseRetryStrategy { get; set; }

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports all properties from <see cref="InstanceInformation"/>.
    /// </summary>
    [JsonPropertyName("appCommandEndpoint")]
    public required string AppCommandEndpoint { get; set; }
}
