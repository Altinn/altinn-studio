using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Summary of a workflow collection (list endpoint).
/// </summary>
public sealed record WorkflowCollectionResponse
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
    /// Gets the workflow IDs that currently form the collection head set.
    /// </summary>
    [JsonPropertyName("heads")]
    public required IReadOnlyList<Guid> Heads { get; init; }

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
/// Detailed view of a workflow collection including head workflow statuses.
/// </summary>
public sealed record WorkflowCollectionDetailResponse
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
    /// Gets the engine clock time when this response was assembled. Compare with head creation
    /// times to measure elapsed processing time without comparing clocks across services.
    /// Nullable for compatibility with older engines; always populated by this engine.
    /// </summary>
    [JsonPropertyName("currentTime")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? CurrentTime { get; init; }

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
public sealed record CollectionHeadStatus
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
    /// Gets the labels of the head workflow. Included so consumers can identify a head (e.g. by an
    /// application-specific label) directly from the collection view, without a second lookup of the
    /// individual workflow.
    /// </summary>
    [JsonPropertyName("labels")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Gets the number of the head workflow's steps that have completed. Together with
    /// <see cref="StepsTotal"/> this gives consumers a progress indication for an executing head
    /// directly from the collection view, without a second lookup of the individual workflow.
    /// Nullable so the wire contract stays additive: consumers must tolerate absence (an older
    /// engine), and the engine always populates it.
    /// </summary>
    [JsonPropertyName("stepsCompleted")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? StepsCompleted { get; init; }

    /// <summary>
    /// Gets the total number of steps in the head workflow. Nullable for the same additive-contract
    /// reason as <see cref="StepsCompleted"/>; always populated by the engine.
    /// </summary>
    [JsonPropertyName("stepsTotal")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? StepsTotal { get; init; }

    /// <summary>
    /// Gets when the head workflow was created (enqueued). Lets a consumer anchor "how long has
    /// this been running" to the engine's clock directly from the collection view, without a
    /// per-workflow lookup. Nullable for the same additive-contract reason as
    /// <see cref="StepsCompleted"/>; always populated by the engine.
    /// </summary>
    [JsonPropertyName("createdAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? CreatedAt { get; init; }

    /// <summary>
    /// Gets the waiting step's own words for what it is waiting for — its most recent deferral
    /// reason (<see cref="Step.LastDeferReason"/>). Populated only while <see cref="Status"/> is
    /// <see cref="PersistentItemStatus.Waiting"/> and the deferring command gave a reason, so a
    /// consumer never sees a stale reason on a head that has moved on.
    /// </summary>
    [JsonPropertyName("waitingReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? WaitingReason { get; init; }

    /// <summary>
    /// Gets how many consecutive attempts of the head's current step (its first step that has not
    /// completed) have failed and been scheduled for retry — that step's
    /// <see cref="Step.RequeueCount"/>. It stays put while a retry attempt executes and returns to
    /// zero when the step defers or is resumed, so a consumer can tell a failing step apart from a
    /// slow one. Nullable for the same additive-contract reason as <see cref="StepsCompleted"/>;
    /// always populated by the engine.
    /// </summary>
    [JsonPropertyName("failedAttempts")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? FailedAttempts { get; init; }
}
