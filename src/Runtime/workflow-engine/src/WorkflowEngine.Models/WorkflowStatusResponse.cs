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
    /// The namespace used for scoping idempotency and workflow references.
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
    /// When the workflow will next be eligible for execution.
    /// </summary>
    [JsonPropertyName("backoffUntil")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? BackoffUntil { get; init; }

    /// <summary>
    /// Optional metadata associated with the workflow (json).
    /// </summary>
    [JsonPropertyName("metadata")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Metadata { get; init; }

    /// <summary>
    /// The actor that initiated the workflow.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

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
            Namespace = workflow.Namespace,
            OperationId = workflow.OperationId,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt,
            StartAt = workflow.StartAt,
            BackoffUntil = workflow.BackoffUntil,
            Metadata = workflow.Metadata,
            Actor = workflow.Actor,
            OverallStatus = workflow.Status,
            Dependencies = workflow.Dependencies?.ToDictionary(x => x.DatabaseId, x => x.Status),
            Links = workflow.Links?.ToDictionary(x => x.DatabaseId, x => x.Status),
            Steps = workflow.Steps.Select(StepStatusResponse.FromStep).ToList(),
        };
}
