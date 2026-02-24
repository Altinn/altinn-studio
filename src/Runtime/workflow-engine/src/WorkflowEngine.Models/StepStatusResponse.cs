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
    public long DatabaseId { get; init; }

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
    /// Metadata associated with the step (json).
    /// </summary>
    [JsonPropertyName("metadata")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Metadata { get; init; }

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
    /// When the step will next be eligible for execution (if backed off).
    /// </summary>
    [JsonPropertyName("backoffUntil")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? BackoffUntil { get; init; }

    [JsonPropertyName("retryStrategy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RetryStrategy? RetryStrategy { get; init; }

    internal static StepStatusResponse FromStep(Step step) =>
        new()
        {
            DatabaseId = step.DatabaseId,
            Command = new CommandDetails
            {
                Type = step.Command.GetType().Name,
                OperationId = step.OperationId,
                Payload = step.Command switch
                {
                    Command.AppCommand x => x.Payload,
                    Command.Webhook x => x.Payload,
                    _ => "",
                },
            },
            ProcessingOrder = step.ProcessingOrder,
            Status = step.Status,
            UpdatedAt = step.UpdatedAt,
            Metadata = step.Metadata,
            RetryCount = step.RequeueCount,
            BackoffUntil = step.BackoffUntil,
            RetryStrategy = step.RetryStrategy,
        };

    public sealed record CommandDetails
    {
        /// <summary>
        /// The command type.
        /// </summary>
        [JsonPropertyName("type")]
        public required string Type { get; init; }

        /// <summary>
        /// An identifier for this operation.
        /// </summary>
        [JsonPropertyName("operationId")]
        public required string OperationId { get; init; }

        /// <summary>
        /// An optional payload for the command.
        /// </summary>
        [JsonPropertyName("payload")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Payload { get; init; }
    }
}
