using System.Text.Json.Serialization;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Payload sent to the Altinn application when an AppCommand is executed.
/// </summary>
internal sealed record AppCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// On a receive workflow's first step: the rendezvous this step consumes. <c>null</c> on every ordinary
    /// callback. Read from the deliveries log per attempt, so a retry and a resume see the same block.
    /// </summary>
    [JsonPropertyName("mailbox")]
    public AppCallbackMailbox? Mailbox { get; init; }

    /// <summary>
    /// The engine's identity for the step being executed. Stable across every attempt of the step —
    /// retries and deferral re-executions alike — which makes it a ready-made idempotency key for
    /// outbound calls the command must not repeat. A superseding workflow mints a new one.
    /// </summary>
    [JsonPropertyName("stepId")]
    public required Guid StepId { get; init; }

    /// <summary>
    /// Stable reference time for this execution: the explicit workflow schedule when present,
    /// otherwise the persisted time when the step was enqueued.
    /// </summary>
    [JsonPropertyName("executionReferenceTime")]
    public required DateTimeOffset ExecutionReferenceTime { get; init; }

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
    /// its first deferral. With <see cref="WaitDeadline"/> this brackets the wait, so a polling command
    /// can pace itself progressively (check often early, sparsely late) without its own bookkeeping.
    /// </summary>
    [JsonPropertyName("firstDeferredAt")]
    public DateTimeOffset? FirstDeferredAt { get; init; }

    /// <summary>
    /// The absolute instant at which the step's wait budget runs out, or <c>null</c> before its first
    /// deferral (nothing is being waited on yet, so the full budget is still ahead).
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would start aging the moment it is serialized.
    /// </remarks>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }
}

/// <summary>
/// The mailbox rendezvous. Exactly one of <see cref="Delivery"/> and <see cref="DisposedReason"/> is
/// present, so an absent delivery is a statement: the exchange is over and this handler must conclude it.
/// </summary>
internal sealed record AppCallbackMailbox
{
    /// <summary>The reply address the app published when it opened the exchange.</summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    /// <summary>
    /// The step's position in the receivers log; <see cref="Delivery"/> is the message at this same position.
    /// </summary>
    [JsonPropertyName("seq")]
    public required long Seq { get; init; }

    /// <summary>The message at <see cref="Seq"/>, or <c>null</c> exactly when the mailbox closed without one.</summary>
    [JsonPropertyName("delivery")]
    public AppCallbackMailboxDelivery? Delivery { get; init; }

    /// <summary>
    /// Why the mailbox closed, when no delivery is present. Wording only — both reasons demand the same
    /// response.
    /// </summary>
    [JsonPropertyName("disposedReason")]
    [JsonConverter(typeof(FlexibleEnumConverter<MailboxDisposedReason>))]
    public MailboxDisposedReason? DisposedReason { get; init; }
}

/// <summary>One message delivered into a mailbox, as its receiver is handed it.</summary>
internal sealed record AppCallbackMailboxDelivery
{
    /// <summary>
    /// The forwarding source's own message id — stable across attempts, so a handler may deduplicate on it.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>The message body, verbatim. The engine stores it and never parses it.</summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }

    /// <summary>When the engine accepted the message — not when this step read it.</summary>
    [JsonPropertyName("acceptedAt")]
    public required DateTimeOffset AcceptedAt { get; init; }
}
