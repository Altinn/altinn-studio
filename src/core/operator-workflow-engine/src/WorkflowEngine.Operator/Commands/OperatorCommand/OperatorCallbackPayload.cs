using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Body the engine posts to the core operator for each attempt of a step.
/// </summary>
/// <remarks>
/// The callback contract with the operator. <c>src/core/operator/api/callbacks/payload.json</c> is its example, and
/// the tests of both sides read it, so change the two together.
/// </remarks>
internal sealed record OperatorCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("context")]
    public required OperatorWorkflowContext Context { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step being executed. Stable across every attempt of the step, retries and
    /// deferrals alike, so the operator uses it as the idempotency key for calls it must not repeat.
    /// </summary>
    [JsonPropertyName("stepId")]
    public required Guid StepId { get; init; }

    /// <summary>
    /// Stable reference time for this execution: the explicit workflow schedule when present, otherwise the
    /// persisted time when the step was enqueued. The operator orders its queue by it.
    /// </summary>
    [JsonPropertyName("executionReferenceTime")]
    public required DateTimeOffset ExecutionReferenceTime { get; init; }

    /// <summary>
    /// The previous step's state, or this step's own state when it deferred last time.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// How many times this step has been retried after a retryable failure since it last deferred.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public int RetryCount { get; init; }

    /// <summary>
    /// The instant the engine stops waiting for this attempt and treats it as a retryable failure.
    /// </summary>
    [JsonPropertyName("executionDeadline")]
    public DateTimeOffset? ExecutionDeadline { get; init; }

    /// <summary>
    /// How many times this step has already deferred. <c>0</c> on a first execution.
    /// </summary>
    [JsonPropertyName("deferCount")]
    public int DeferCount { get; init; }

    /// <summary>
    /// When this step deferred for the first time, or <c>null</c> before its first deferral.
    /// </summary>
    [JsonPropertyName("firstDeferredAt")]
    public DateTimeOffset? FirstDeferredAt { get; init; }

    /// <summary>
    /// The instant the step's wait budget runs out, or <c>null</c> before its first deferral.
    /// </summary>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }

    /// <summary>
    /// Whether this attempt is the step's final check, so deferring fails the step as expired.
    /// </summary>
    [JsonPropertyName("isFinalWaitCheck")]
    public bool IsFinalWaitCheck { get; init; }
}
