using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Details about a workflow engine step.
/// </summary>
internal sealed record StepStatusResponse
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
    /// The number of times this step has been retried. Reset by a deferral, so it counts consecutive
    /// errors between waits rather than errors across the step's lifetime.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public required int RetryCount { get; init; }

    /// <summary>
    /// The number of times this step has deferred — parked in <see cref="PersistentItemStatus.Waiting"/>
    /// because the outcome it awaits was not available yet.
    /// </summary>
    [JsonPropertyName("deferCount")]
    public int DeferCount { get; init; }

    /// <summary>
    /// When this step first deferred, which anchors its wait budget. Absent when it never deferred.
    /// </summary>
    [JsonPropertyName("firstDeferredAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? FirstDeferredAt { get; init; }

    /// <summary>
    /// The reason given by this step's most recent deferral — the command's own words for why it is
    /// waiting. Absent when the step has never deferred or gave no reason.
    /// </summary>
    [JsonPropertyName("lastDeferReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? LastDeferReason { get; init; }

    /// <summary>
    /// The output state produced by this step, passed as input to the next step.
    /// </summary>
    [JsonPropertyName("stateOut")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StateOut { get; init; }

    [JsonPropertyName("retryStrategy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RetryStrategy? RetryStrategy { get; init; }

    /// <summary>
    /// Error entries recorded while attempting to execute this step.
    /// </summary>
    [JsonPropertyName("errorHistory")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<ErrorEntry>? ErrorHistory { get; init; }

    internal sealed record CommandDetails
    {
        /// <summary>
        /// The command type.
        /// </summary>
        [JsonPropertyName("type")]
        public required string Type { get; init; }
    }
}
