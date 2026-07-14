using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Detailed view of a workflow collection including head workflow statuses.
/// </summary>
internal sealed record WorkflowCollectionDetailResponse
{
    /// <summary>
    /// Gets the collection key unique within a namespace.
    /// </summary>
    [JsonPropertyName("key")]
    public required string Key { get; init; }

    /// <summary>
    /// Gets the namespace that owns the collection.
    /// </summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    /// <summary>
    /// Gets the current collection heads with their workflow statuses.
    /// </summary>
    [JsonPropertyName("heads")]
    public required IReadOnlyList<CollectionHeadStatus> Heads { get; init; }

    /// <summary>
    /// Gets when the collection row was created.
    /// </summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// Gets when the collection row was last updated, if it has been updated.
    /// </summary>
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset? UpdatedAt { get; init; }
}

/// <summary>
/// Status of a single head workflow within a collection.
/// </summary>
internal sealed record CollectionHeadStatus
{
    /// <summary>
    /// Gets the database ID of the head workflow.
    /// </summary>
    [JsonPropertyName("databaseId")]
    public required Guid DatabaseId { get; init; }

    /// <summary>
    /// Gets the current persistent status of the head workflow.
    /// </summary>
    [JsonPropertyName("status")]
    public required PersistentItemStatus Status { get; init; }

    /// <summary>
    /// Gets the labels of the head workflow. Lets a consumer read a head's application labels (e.g.
    /// the process-next target task) directly from the collection, without a second per-workflow
    /// lookup. Null only when the head workflow carries no labels.
    /// </summary>
    [JsonPropertyName("labels")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Gets the number of the head workflow's steps that have completed. Together with
    /// <see cref="StepsTotal"/> this gives a progress indication for an executing head directly
    /// from the collection view. Null when the engine predates the field - consumers must treat
    /// absence as "no progress information".
    /// </summary>
    [JsonPropertyName("stepsCompleted")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? StepsCompleted { get; init; }

    /// <summary>
    /// Gets the total number of steps in the head workflow. Null when the engine predates the
    /// field.
    /// </summary>
    [JsonPropertyName("stepsTotal")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? StepsTotal { get; init; }
}
