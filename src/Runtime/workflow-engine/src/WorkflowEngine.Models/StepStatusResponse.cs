using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

/// <summary>
/// Details about a workflow engine step.
/// </summary>
public sealed record StepStatusResponse
{
    /// <summary>
    /// The database ID of the step.
    /// </summary>
    [JsonPropertyName("databaseId")]
    public Guid DatabaseId { get; init; }

    /// <summary>
    /// An identifier for this operation.
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The processing order of the step.
    /// </summary>
    [JsonPropertyName("processingOrder")]
    public required int ProcessingOrder { get; init; }

    /// <summary>
    /// The last time this record was updated.
    /// </summary>
    [JsonPropertyName("updatedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? UpdatedAt { get; internal set; }

    /// <summary>
    /// Labels associated with the step.
    /// </summary>
    [JsonPropertyName("labels")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Details about the command.
    /// </summary>
    [JsonPropertyName("command")]
    public required CommandDetails Command { get; init; }

    /// <summary>
    /// The current execution status.
    /// </summary>
    [JsonPropertyName("status")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PersistentItemStatus Status { get; init; }

    /// <summary>
    /// The number of times this step has been retried.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public required int RetryCount { get; init; }

    /// <summary>
    /// The output state produced by this step, passed as input to the next step.
    /// </summary>
    [JsonPropertyName("stateOut")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StateOut { get; init; }

    [JsonPropertyName("retryStrategy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RetryStrategy? RetryStrategy { get; init; }

    internal static StepStatusResponse FromStep(Step step) =>
        new()
        {
            DatabaseId = step.DatabaseId,
            OperationId = step.OperationId,
            Command = new CommandDetails { Type = step.Command.Type },
            ProcessingOrder = step.ProcessingOrder,
            Status = step.Status,
            UpdatedAt = step.UpdatedAt,
            Labels = step.Labels,
            RetryCount = step.RequeueCount,
            StateOut = step.StateOut,
            RetryStrategy = step.RetryStrategy,
        };

    public sealed record CommandDetails
    {
        /// <summary>
        /// The command type.
        /// </summary>
        [JsonPropertyName("type")]
        public required string Type { get; init; }
    }
}
