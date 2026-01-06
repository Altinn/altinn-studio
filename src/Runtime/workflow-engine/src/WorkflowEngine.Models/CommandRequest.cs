using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Represents a single task to be processed by the process engine.
/// </summary>
public sealed record CommandRequest
{
    /// <summary>
    /// The command to be executed by the process engine.
    /// </summary>
    [JsonPropertyName("command")]
    public required Command Command { get; init; }

    /// <summary>
    /// An optional start time for when the task should be executed.
    /// </summary>
    [JsonPropertyName("startTime")]
    public DateTimeOffset? StartTime { get; init; }

    /// <summary>
    /// An optional retry strategy for the task. If none given, the default strategy will be used.
    /// </summary>
    [JsonPropertyName("retryStrategy")]
    public RetryStrategy? RetryStrategy { get; init; }
}
