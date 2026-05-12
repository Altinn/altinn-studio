using System.Text.Json;

namespace WorkflowEngine.Models;

/// <summary>
/// A Workflow defines a logical collection of <see cref="Step">Steps</see> along with optional
/// dependencies and links to other workflows.
/// </summary>
public sealed record Workflow : PersistentItem
{
    /// <summary>
    /// Optional collection key shared by all workflows in a batch.
    /// Used for grouping and looking up related workflows.
    /// </summary>
    public string? CollectionKey { get; init; }

    /// <summary>
    /// The idempotency key for this workflow, unique within a namespace.
    /// </summary>
    public required string IdempotencyKey { get; set; }

    /// <summary>
    /// Primary isolation boundary. Idempotency keys are unique within a namespace.
    /// Example: an instance GUID, a customer ID, a project ID — whatever the host defines.
    /// </summary>
    public required string Namespace { get; init; }

    /// <summary>
    /// Opaque context passed to command handlers at execution time.
    /// The engine stores but never inspects this. Handlers deserialize what they need.
    /// Example: {"lockToken":"...", "actor":{...}, "commandEndpoint":"..."}
    /// </summary>
    public JsonElement? Context { get; init; }

    /// <summary>
    /// Optional earliest time at which the workflow may begin execution.
    /// Workflows scheduled in the future are skipped by the fetch query until this time is reached.
    /// </summary>
    public DateTimeOffset? StartAt { get; init; }

    /// <summary>
    /// Earliest time at which the workflow is eligible for re-fetch after a retryable failure.
    /// Set by the engine based on the active <see cref="Step.RetryStrategy"/>.
    /// </summary>
    public DateTimeOffset? BackoffUntil { get; set; }

    /// <summary>
    /// Last time the owning worker proved liveness for this workflow.
    /// A workflow whose heartbeat falls outside <see cref="EngineSettings.StaleWorkflowThreshold"/>
    /// is considered stale and may be reclaimed by another worker.
    /// </summary>
    public DateTimeOffset? HeartbeatAt { get; set; }

    /// <summary>
    /// Number of times this workflow has been reclaimed from a stale worker.
    /// Once <see cref="EngineSettings.MaxReclaimCount"/> is reached the workflow is treated as poisoned and failed.
    /// </summary>
    public int ReclaimCount { get; set; }

    /// <summary>
    /// Per-fetch lease identifier. <c>null</c> until the workflow is first fetched; a fresh token is
    /// then issued on every fetch by the engine and asserted on heartbeat and write-back to prevent
    /// a stale worker from writing over a workflow that has been reclaimed by another host. Cleared
    /// on every transition out of <c>Processing</c> (terminal write-back, resume, poison abandon,
    /// stale reclaim) to maintain the invariant "<c>LeaseToken IS NOT NULL iff Status = Processing</c>",
    /// which is what makes a frozen owner's later CAS fail deterministically.
    /// </summary>
    public Guid? LeaseToken { get; set; }

    /// <summary>
    /// The workflow's steps, in declaration order. Execution order is determined by <see cref="Step.ProcessingOrder"/>.
    /// </summary>
    public required IReadOnlyList<Step> Steps { get; init; }

    /// <summary>
    /// Captured W3C trace context (traceparent/tracestate) of the caller that enqueued this workflow.
    /// Used to link engine-side activities back to the originating client trace.
    /// </summary>
    public string? DistributedTraceContext { get; set; }

    /// <summary>
    /// When cancellation was requested for this workflow. <c>null</c> if no cancellation has been requested.
    /// Polled by the cancellation watcher to propagate cancellation across pods.
    /// </summary>
    public DateTimeOffset? CancellationRequestedAt { get; set; }

    /// <summary>
    /// Workflows that must complete before this one is eligible for execution.
    /// </summary>
    public IEnumerable<Workflow>? Dependencies { get; init; }

    /// <summary>
    /// Workflows that declare this one as a dependency. Inverse of <see cref="Dependencies"/>.
    /// </summary>
    public IEnumerable<Workflow>? Dependents { get; init; }

    /// <summary>
    /// Soft-linked workflows associated with this one (for grouping and dashboard navigation, no execution effect).
    /// </summary>
    public IEnumerable<Workflow>? Links { get; init; }

    /// <summary>
    /// Optional opaque state passed as <see cref="CommandExecutionContext.StateIn"/> to the first step.
    /// Subsequent steps receive the previous step's <see cref="Step.StateOut"/>.
    /// </summary>
    public string? InitialState { get; init; }

    internal DateTimeOffset? ExecutionStartedAt { get; set; }

    /// <inheritdoc/>
    public override string ToString() => $"[{GetType().Name}] {OperationId} ({Status})";

    /// <inheritdoc/>
    public override int GetHashCode() => DatabaseId.GetHashCode();

    /// <summary>
    /// Records are equal when their <see cref="PersistentItem.DatabaseId"/> matches; the workflow row, not the in-memory snapshot, is the identity.
    /// </summary>
    public bool Equals(Workflow? other) => other?.DatabaseId == DatabaseId;
}
