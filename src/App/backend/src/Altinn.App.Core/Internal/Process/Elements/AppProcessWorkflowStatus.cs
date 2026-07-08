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
/// A slim, consumer-facing projection of a failed process transition. Intentionally omits engine
/// internals (workflow ids, collection keys, retry counts).
/// </summary>
public sealed class AppProcessWorkflowFailure
{
    /// <summary>
    /// Human-readable failure detail, suitable for display. Sourced from the workflow engine's
    /// last recorded error (including detail extracted from a failing service task / callback).
    /// </summary>
    [JsonPropertyName("detail")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Detail { get; init; }

    /// <summary>
    /// The failure classification.
    /// </summary>
    [JsonPropertyName("kind")]
    public WorkflowFailureKind Kind { get; init; }
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
