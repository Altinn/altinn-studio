using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Live workflow-engine status for the instance's current task, layered on top of the
/// Storage-committed process state. It lets the frontend tell a settled task apart from one where
/// a transition is still executing (<see cref="WorkflowActivityStatus.Processing"/>) or has failed
/// and must be retried (<see cref="WorkflowActivityStatus.Failed"/>), rather than having to infer
/// the truth from a lagging committed state.
/// </summary>
public sealed class AppProcessWorkflowStatus
{
    /// <summary>
    /// The live activity status of the current task's transition.
    /// </summary>
    [JsonPropertyName("status")]
    public WorkflowActivityStatus Status { get; init; }

    /// <summary>
    /// The BPMN element id of the task the in-flight or failed transition is moving toward, when
    /// known. Omitted when the status is <see cref="WorkflowActivityStatus.Idle"/> or the target
    /// cannot be resolved.
    /// </summary>
    [JsonPropertyName("targetTask")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TargetTask { get; init; }

    /// <summary>
    /// Failure detail. Present only when <see cref="Status"/> is
    /// <see cref="WorkflowActivityStatus.Failed"/>.
    /// </summary>
    [JsonPropertyName("failure")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public AppProcessWorkflowFailure? Failure { get; init; }
}

/// <summary>
/// A slim, consumer-facing projection of a failed process transition: the coarse classification
/// plus the safe structured facts a support dialogue needs (which workflow, when). The raw error
/// detail is intentionally never serialized to clients - it originates from exception/callback
/// messages that can carry internal infrastructure text. It remains available server-side
/// (callback failure logs and the engine's step error history, keyed by <see cref="WorkflowId"/>).
/// </summary>
public sealed class AppProcessWorkflowFailure
{
    /// <summary>
    /// The failure classification.
    /// </summary>
    [JsonPropertyName("kind")]
    public WorkflowFailureKind Kind { get; init; }

    /// <summary>
    /// The id of the failed workflow - a support reference that lets operations find the failure
    /// (and its full error history) in the engine. Omitted when unknown.
    /// </summary>
    [JsonPropertyName("workflowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? WorkflowId { get; init; }

    /// <summary>
    /// When the failure was recorded (the failing step's last error timestamp). Omitted when
    /// unknown.
    /// </summary>
    [JsonPropertyName("occurredAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? OccurredAt { get; init; }
}

/// <summary>
/// The consumer-facing activity status of a task's workflow transition. Deliberately coarse:
/// <see cref="Processing"/> covers the first attempt and every automatic retry, because the
/// consumer behaviour (wait) is identical and the attempt count is noise.
/// </summary>
[JsonConverter(typeof(JsonCamelCaseEnumConverter))]
public enum WorkflowActivityStatus
{
    /// <summary>
    /// No workflow is executing or failed for the current task; render normally.
    /// </summary>
    Idle,

    /// <summary>
    /// A transition is executing (first attempt or any automatic retry); the consumer should wait.
    /// </summary>
    Processing,

    /// <summary>
    /// The transition failed terminally and must be retried (resumed) before the process can continue.
    /// </summary>
    Failed,
}
