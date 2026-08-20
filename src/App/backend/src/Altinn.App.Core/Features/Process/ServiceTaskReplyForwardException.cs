using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Process;

/// <summary>Thrown by <see cref="IServiceTaskReplyForwarder.ForwardReply"/> when a message was not accepted.</summary>
/// <remarks>
/// The forwarder deliberately does not decide what an undeliverable message means for the receiving
/// channel — only the feature that received the message knows whether to dead-letter it, alert on it,
/// or drop it, and whether the channel should be told to redeliver. Catch this, use
/// <see cref="Outcome"/> and <see cref="IsTransient"/> to choose, and let the message be redelivered
/// only when trying again could actually help.
/// </remarks>
public sealed class ServiceTaskReplyForwardException : AltinnException
{
    /// <summary>Why the message was not accepted.</summary>
    public ServiceTaskReplyForwardOutcome Outcome { get; }

    /// <summary>
    /// <see langword="true"/> when forwarding the same message again could succeed — the engine was
    /// unreachable, or the app could not seal the message because its callback code was not available
    /// yet. <see langword="false"/> when the outcome is settled: no amount of retrying will place this
    /// message anywhere. Note that <see cref="ServiceTaskReplyForwardOutcome.MailboxFull"/> is settled
    /// too — a mailbox's message count never goes back down.
    /// </summary>
    public bool IsTransient =>
        Outcome
            is ServiceTaskReplyForwardOutcome.EngineUnavailable
                or ServiceTaskReplyForwardOutcome.SigningUnavailable;

    /// <summary>
    /// The reply address the message was forwarded to — the value the external system echoed back,
    /// which is the mailbox the exchange runs through.
    /// </summary>
    public Guid MailboxId { get; }

    /// <summary>The idempotency key supplied for the message — the source's own message id.</summary>
    public string? IdempotencyKey { get; }

    /// <summary>
    /// Creates a forwarding failure. Public deliberately: this API asks the receiving channel to branch on
    /// <see cref="Outcome"/>, so it must be possible to unit-test that branch by making a stubbed
    /// <see cref="IServiceTaskReplyForwarder"/> throw the outcome under test.
    /// </summary>
    /// <param name="outcome">Why the message was not accepted.</param>
    /// <param name="mailboxId">The reply address the message was forwarded to.</param>
    /// <param name="idempotencyKey">The idempotency key supplied for the message, if any.</param>
    /// <param name="message">Human-readable description of the failure.</param>
    /// <param name="innerException">The underlying failure, when there was one.</param>
    public ServiceTaskReplyForwardException(
        ServiceTaskReplyForwardOutcome outcome,
        Guid mailboxId,
        string? idempotencyKey,
        string message,
        Exception? innerException = null
    )
        : base(message, innerException)
    {
        Outcome = outcome;
        MailboxId = mailboxId;
        IdempotencyKey = idempotencyKey;
    }
}
