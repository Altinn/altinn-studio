using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A single workflow entry within a batch enqueue request.
/// </summary>
internal sealed record WorkflowRequest
{
    /// <summary>
    /// Optional request-scoped alias for this workflow, used to reference it within this batch (never persisted).
    /// Only required when other workflows in the same batch reference this one via <see cref="DependsOn"/> or <see cref="Links"/>.
    /// </summary>
    [JsonPropertyName("ref")]
    public string? Ref { get; init; }

    /// <summary>
    /// An identifier for this operation.
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The individual steps comprising this workflow.
    /// </summary>
    [JsonPropertyName("steps")]
    public required IReadOnlyList<StepRequest> Steps { get; init; }

    /// <summary>
    /// An optional start time for when the workflow should be executed.
    /// </summary>
    [JsonPropertyName("startAt")]
    public DateTimeOffset? StartAt { get; init; }

    /// <summary>
    /// Opaque state passed through from the app. The engine never inspects this.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// Workflows that must complete before this one can execute.
    /// Each entry is either a batch-scoped ref string (e.g. <c>"step-a"</c>) or an already-persisted
    /// database ID (e.g. a GUID), allowing mixed arrays such as <c>["step-a", "d4e5f6a7-...", "step-b"]</c>.
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
