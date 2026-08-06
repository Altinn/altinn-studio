using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

/// <summary>
/// Payload sent to the application when an AppCommand is executed.
/// </summary>
public sealed record AppCallbackPayload
{
    /// <summary>
    /// The key identifying which command to execute.
    /// </summary>
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    /// <summary>
    /// The actor on whose behalf the command is executed.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    /// <summary>
    /// The lock token for the current workflow execution.
    /// </summary>
    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    /// <summary>
    /// Optional command-specific payload.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    /// <summary>
    /// The workflow ID assigned by the engine.
    /// </summary>
    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step being executed. Stable across every attempt of the step —
    /// retries and deferral re-executions alike — which makes it a ready-made idempotency key for
    /// outbound calls the command must not repeat. Deliberately not <c>required</c>: an engine that
    /// predates the field leaves it <see cref="Guid.Empty"/> rather than failing the callback.
    /// </summary>
    [JsonPropertyName("stepId")]
    public Guid StepId { get; init; }

    /// <summary>
    /// Opaque state blob passed through from the previous command — or, for a step being re-executed
    /// after a deferral, the state that step itself produced on its previous attempt.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// How many times this step has been retried after a retryable failure. Reset to <c>0</c> whenever
    /// the step defers, so it counts consecutive failures since the last re-check rather than attempts
    /// across the step's whole life.
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
    /// When this step deferred for the first time — the instant its wait began — or <c>null</c> before
    /// its first deferral.
    /// </summary>
    [JsonPropertyName("firstDeferredAt")]
    public DateTimeOffset? FirstDeferredAt { get; init; }

    /// <summary>
    /// The instant this step's wait budget runs out, or <c>null</c> before its first deferral.
    /// </summary>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }
}
