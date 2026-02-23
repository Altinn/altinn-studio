using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A single workflow entry within a batch enqueue request.
/// </summary>
public sealed record WorkflowRequest
{
    /// <summary>
    /// Request-scoped alias for this workflow, used to reference it within this batch (never persisted).
    /// </summary>
    [JsonPropertyName("ref")]
    public required string Ref { get; init; }

    /// <summary>
    /// An identifier for this operation.
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The type of workflow this request is for.
    /// </summary>
    [JsonPropertyName("type")]
    public required WorkflowType Type { get; init; }

    /// <summary>
    /// The individual steps comprising this workflow.
    /// </summary>
    [JsonPropertyName("steps")]
    public required IEnumerable<StepRequest> Steps { get; init; }

    /// <summary>
    /// An optional start time for when the workflow should be executed.
    /// </summary>
    [JsonPropertyName("startAt")]
    public DateTimeOffset? StartAt { get; init; }

    /// <summary>
    /// Optional metadata for the request. Expects JSON string.
    /// </summary>
    [JsonPropertyName("metadata")]
    public string? Metadata { get; init; }

    /// <summary>
    /// Workflows that must complete before this one can execute.
    /// Each entry is either a batch-scoped ref string (e.g. <c>"step-a"</c>) or an already-persisted
    /// database ID (e.g. <c>1234</c>), allowing mixed arrays such as <c>["step-a", 1234, "step-b"]</c>.
    /// </summary>
    [JsonPropertyName("dependsOn")]
    public IEnumerable<WorkflowRef>? DependsOn { get; init; }

    /// <summary>
    /// Workflows that are soft-linked to this one (association without execution dependency).
    /// Each entry is either a batch-scoped ref string or an already-persisted database ID.
    /// </summary>
    [JsonPropertyName("links")]
    public IEnumerable<WorkflowRef>? Links { get; init; }
}
