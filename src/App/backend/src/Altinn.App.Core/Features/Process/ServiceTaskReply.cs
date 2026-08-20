namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One message delivered into the mailbox a service task opened with
/// <see cref="ServiceTaskPipeline.WithReplyFrom"/>, handed to the pipeline's conclusion as
/// <see cref="ServiceTaskContext.Reply"/>. Exactly one message per execution — each is its own durable,
/// retryable unit of work with its own <see cref="ServiceTaskContext.StepId"/>.
/// </summary>
/// <remarks>
/// The payload originated outside the platform and is untrusted input: validate and deserialize it
/// defensively. A message that cannot be understood is an ordinary
/// <see cref="ServiceTaskResult.FailedPermanent"/>, which concludes the exchange as failed in the task's own
/// words. Messages arrive one at a time, in the order the mailbox accepted them, each starting from the state
/// its predecessor published; a handler asks for the next with
/// <see cref="ServiceTaskResult.AwaitNextReply"/>. Delivery is at-least-once, so key durable writes and
/// outbound calls on <see cref="IdempotencyKey"/> or on <see cref="ServiceTaskContext.StepId"/>.
/// </remarks>
public sealed record ServiceTaskReply
{
    /// <summary>
    /// The message body, exactly as it was delivered. Opaque to the platform and <strong>untrusted</strong>.
    /// </summary>
    /// <remarks>
    /// Guaranteed to be byte-for-byte what <see cref="IServiceTaskReplyForwarder.ForwardReply"/> forwarded into
    /// this mailbox, for this task, under this <see cref="IdempotencyKey"/>: the body travels in a tamper-evident
    /// envelope, and one that does not open fails the step rather than reaching this property. That says nothing
    /// about whether the content is <em>true</em>.
    /// </remarks>
    public required string Payload { get; init; }

    /// <summary>
    /// The key the message was accepted under — the forwarding source's own message id. Stable across every attempt
    /// of this execution and unique within the mailbox, so it is the natural key for a side effect this handler
    /// must not repeat. Covered by the message's integrity envelope alongside <see cref="Payload"/>, so keying
    /// durable work on it keys on a value the platform authenticated.
    /// </summary>
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// When the mailbox accepted the message — the instant it became durable, not the instant this
    /// handler was handed it. A message that arrived before its receiver existed can make the two
    /// far apart.
    /// </summary>
    public required DateTimeOffset AcceptedAt { get; init; }

    /// <summary>
    /// This message's position in the exchange: <c>0</c> for the first message, <c>1</c> for the one
    /// asked for with <see cref="ServiceTaskResult.AwaitNextReply"/> after it, and so on. Useful for
    /// logging and for a handler that words itself differently on a later hop; never an idempotency
    /// key (<see cref="IdempotencyKey"/> is).
    /// </summary>
    public required long Position { get; init; }
}
