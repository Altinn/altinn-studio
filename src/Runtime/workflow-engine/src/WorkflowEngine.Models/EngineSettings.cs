using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

/// <summary>
/// Configuration settings for the workflow engine.
/// </summary>
public sealed record EngineSettings
{
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
}
