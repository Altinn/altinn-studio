namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One message delivered into the mailbox a service task's stage opened, handed to the reply terminal's
/// <c>onMessage</c> handler — exactly one per execution, each its own durable unit of work.
/// </summary>
/// <remarks>
/// The payload originated outside the platform: validate defensively. Delivery is at-least-once, so key
/// durable side effects on <see cref="IdempotencyKey"/> or <see cref="ServiceTaskContext.StepId"/>.
/// </remarks>
public sealed record ServiceTaskReply
{
    /// <summary>
    /// The message body — byte-for-byte what <see cref="IServiceTaskReplyForwarder.ForwardReply"/> forwarded
    /// for this mailbox, task and key (the envelope guarantees the round trip), but still
    /// <strong>untrusted</strong> content chosen outside the platform.
    /// </summary>
    public required string Payload { get; init; }

    /// <summary>
    /// The forwarding source's own message id: stable across attempts, unique within the mailbox, and covered
    /// by the integrity envelope — the natural key for side effects this handler must not repeat.
    /// </summary>
    public required string IdempotencyKey { get; init; }

    /// <summary>When the mailbox accepted the message — not when this handler was handed it.</summary>
    public required DateTimeOffset AcceptedAt { get; init; }

    /// <summary>
    /// This message's position in the exchange, starting at <c>0</c>. For logging and wording; never an
    /// idempotency key (<see cref="IdempotencyKey"/> is).
    /// </summary>
    public required long Position { get; init; }
}
