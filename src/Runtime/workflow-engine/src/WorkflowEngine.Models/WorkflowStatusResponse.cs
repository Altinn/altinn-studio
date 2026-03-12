using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response model for workflow engine status endpoint.
/// </summary>
public sealed record WorkflowStatusResponse
{
    /// <summary>
    /// The database ID of the workflow.
    /// </summary>
    [JsonPropertyName("databaseId")]
    public Guid DatabaseId { get; init; }

    /// <summary>
    /// An identifier for this operation.
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// An idempotency key for this workflow.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// The namespace this workflow belongs to.
    /// </summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    /// <summary>
    /// The time the workflow was created.
    /// </summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// The last time this record was updated.
    /// </summary>
    [JsonPropertyName("updatedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? UpdatedAt { get; init; }

    /// <summary>
    /// Optional start time for when the workflow should be executed.
    /// </summary>
    [JsonPropertyName("startAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? StartAt { get; init; }

    /// <summary>
    /// Optional metadata associated with the workflow (json).
    /// </summary>
    [JsonPropertyName("metadata")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Metadata { get; init; }

    /// <summary>
    /// Labels associated with this workflow.
    /// </summary>
    [JsonPropertyName("labels")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// The overall status of the workflow for this instance.
    /// </summary>
    [JsonPropertyName("overallStatus")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required PersistentItemStatus OverallStatus { get; init; }

    /// <summary>
    /// Optional dependencies for this workflow, presented as a dictionary of workflow ID and corresponding processing status.
    /// </summary>
    [JsonPropertyName("dependencies")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<Guid, PersistentItemStatus>? Dependencies { get; init; }

    /// <summary>
    /// Optional links for this workflow, presented as a dictionary of workflow ID and corresponding processing status.
    /// </summary>
    [JsonPropertyName("links")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<Guid, PersistentItemStatus>? Links { get; init; }

    /// <summary>
    /// Details about each step in the workflow.
    /// </summary>
    [JsonPropertyName("steps")]
    public required IReadOnlyList<StepStatusResponse> Steps { get; init; }

    public static WorkflowStatusResponse FromWorkflow(Workflow workflow) =>
        new()
        {
            DatabaseId = workflow.DatabaseId,
            IdempotencyKey = workflow.IdempotencyKey,
            OperationId = workflow.OperationId,
            Namespace = workflow.Namespace,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt,
            StartAt = workflow.StartAt,
            Metadata = workflow.Metadata,
            Labels = workflow.Labels,
            OverallStatus = workflow.Status,
            Dependencies = workflow.Dependencies?.ToDictionary(x => x.DatabaseId, x => x.Status),
            Links = workflow.Links?.ToDictionary(x => x.DatabaseId, x => x.Status),
            Steps = workflow.Steps.Select(StepStatusResponse.FromStep).ToList(),
        };
}
