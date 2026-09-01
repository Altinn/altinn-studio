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

    /// <summary>
    /// Gets the status rollup across every workflow in the collection — visible and invisible
    /// alike — so a consumer can derive per-collection health without enumerating workflows.
    /// Nullable so the wire contract stays additive: consumers must tolerate absence (an older
    /// engine), and the engine always populates it. See <see cref="CollectionWorkflowCounts"/>
    /// for the bucket definitions.
    /// </summary>
    [JsonPropertyName("workflowCounts")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public CollectionWorkflowCounts? WorkflowCounts { get; init; }
}

/// <summary>
/// Per-collection workflow status rollup. Counts every workflow enqueued under the collection key,
/// including workflows enqueued with <c>isHead = false</c> that the head frontier deliberately hides.
/// </summary>
/// <remarks>
/// The failed buckets split on head <em>visibility</em>: a workflow is visible unless its persisted
/// <c>isHead</c> directive is exactly <c>false</c> (the default <c>null</c> counts as visible).
/// <see cref="PersistentItemStatus.Abandoned"/> is excluded from both failed buckets — it is the
/// engine's adjudication marker for a written-off failure — but still counts toward
/// <see cref="Total"/>. There is deliberately no named "settled" bucket: successful, abandoned, and
/// any future status show up as the remainder <c>total - active - failedVisible - failedInvisible</c>,
/// so a new status can never be silently misfiled.
/// </remarks>
public sealed record CollectionWorkflowCounts
{
    /// <summary>
    /// Gets the number of workflows in a non-terminal status — still in flight, whether running or
    /// parked: <see cref="PersistentItemStatus.Enqueued"/>, <see cref="PersistentItemStatus.Processing"/>,
    /// <see cref="PersistentItemStatus.Requeued"/>, <see cref="PersistentItemStatus.Waiting"/>, or
    /// <see cref="PersistentItemStatus.Held"/>. A <see cref="PersistentItemStatus.Held"/> mailbox
    /// receiver counts here: it is parked awaiting its delivery, but consumes admission budget and
    /// still gates its dependents.
    /// </summary>
    [JsonPropertyName("active")]
    public required int Active { get; init; }

    /// <summary>
    /// Gets the number of unsuccessfully terminal workflows (<see cref="PersistentItemStatus.Failed"/>,
    /// <see cref="PersistentItemStatus.Canceled"/>, <see cref="PersistentItemStatus.DependencyFailed"/>)
    /// that are visible to the head frontier (<c>isHead</c> directive not <c>false</c>).
    /// </summary>
    [JsonPropertyName("failedVisible")]
    public required int FailedVisible { get; init; }

    /// <summary>
    /// Gets the number of unsuccessfully terminal workflows in the same statuses as
    /// <see cref="FailedVisible"/> that were enqueued with <c>isHead = false</c> — invisible to the
    /// head frontier, so their failures surface nowhere else in collection status reads.
    /// </summary>
    [JsonPropertyName("failedInvisible")]
    public required int FailedInvisible { get; init; }

    /// <summary>
    /// Gets the total number of workflows in the collection, regardless of status or visibility.
    /// </summary>
    [JsonPropertyName("total")]
    public required int Total { get; init; }
}

/// <summary>
/// Detailed view of a workflow collection including head workflow statuses.
/// </summary>
/// <remarks>
/// This is a <em>frontier</em> view by contract: it reports only the current head workflows, so
/// workflows enqueued with <c>isHead = false</c> (invisible side effects) never appear here, and
/// their failures do not affect this response. Use the collection list endpoint's
/// <see cref="WorkflowCollectionResponse.WorkflowCounts"/> rollup, or the workflow list endpoint's
/// <c>isHead</c> filter, to see them.
/// </remarks>
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
}
