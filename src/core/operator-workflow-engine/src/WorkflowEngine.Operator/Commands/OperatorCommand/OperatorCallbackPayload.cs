using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Body the engine posts to the core operator for each attempt of a step.
/// </summary>
/// <remarks>
/// <c>src/core/operator/testdata/callbacks/payload.json</c> is its example, which the tests of both sides read. Change
/// them together.
/// </remarks>
internal sealed record OperatorCallbackPayload
{
    /// <summary>The step's key, which is also the last segment of the callback's path.</summary>
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    /// <summary>The context that the operator gave the workflow when it enqueued it.</summary>
    [JsonPropertyName("context")]
    public required OperatorWorkflowContext Context { get; init; }

    /// <summary>The workflow's id in the engine.</summary>
    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The same for every attempt of the step, so the operator can use it as the idempotency key for a call it must
    /// not repeat.
    /// </summary>
    [JsonPropertyName("stepId")]
    public required Guid StepId { get; init; }

    /// <summary>
    /// The same for every attempt of the step. The operator orders its queue by it.
    /// </summary>
    [JsonPropertyName("executionReferenceTime")]
    public required DateTimeOffset ExecutionReferenceTime { get; init; }

    /// <summary>
    /// The previous step's state, or this step's own state when it deferred last time.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// How many times the engine retried this step after a retryable failure since its last deferral.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public int RetryCount { get; init; }

    /// <summary>
    /// When the engine stops waiting for this attempt and treats it as a retryable failure.
    /// </summary>
    [JsonPropertyName("executionDeadline")]
    public DateTimeOffset? ExecutionDeadline { get; init; }

    /// <summary>How many times this step has deferred.</summary>
    [JsonPropertyName("deferCount")]
    public int DeferCount { get; init; }

    /// <summary>When this step first deferred, or <c>null</c> before then.</summary>
    [JsonPropertyName("firstDeferredAt")]
    public DateTimeOffset? FirstDeferredAt { get; init; }

    /// <summary>
    /// When the step's wait budget runs out, or <c>null</c> before its first deferral.
    /// </summary>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }

    /// <summary>
    /// On the step's final check, a deferral fails the step as expired.
    /// </summary>
    [JsonPropertyName("isFinalWaitCheck")]
    public bool IsFinalWaitCheck { get; init; }
}
