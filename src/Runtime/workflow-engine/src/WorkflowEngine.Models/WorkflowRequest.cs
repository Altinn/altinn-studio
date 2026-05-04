using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A single workflow entry within a batch enqueue request.
/// </summary>
public sealed record WorkflowRequest
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

    /// <summary>
    /// Controls whether this workflow automatically depends on the collection's current head workflows.
    /// Only meaningful when the enqueue metadata includes a collection key.
    /// When <c>true</c> (the default) and this workflow is a root (no intra-batch <see cref="DependsOn"/>),
    /// the engine injects dependencies on the collection's current heads.
    /// Set to <c>false</c> to opt out of automatic head dependency injection.
    /// </summary>
    [JsonPropertyName("dependsOnHeads")]
    public bool DependsOnHeads { get; init; } = true;

    /// <summary>
    /// Controls whether this workflow is included in the collection's head set after enqueue.
    /// Only meaningful when the enqueue metadata includes a collection key.
    /// <list type="bullet">
    ///   <item><c>true</c> — Force-include: always a head, even if other batch workflows depend on it.</item>
    ///   <item><c>null</c> (default) — Neutral: natural leaf detection applies (head if nothing in the batch depends on it).</item>
    ///   <item><c>false</c> — Force-exclude: never a head, and this workflow's dependency edges do not consume
    ///         existing heads. The workflow is effectively invisible to collection head tracking while still
    ///         participating in execution ordering.</item>
    /// </list>
    /// </summary>
    [JsonPropertyName("isHead")]
    public bool? IsHead { get; init; }
}
