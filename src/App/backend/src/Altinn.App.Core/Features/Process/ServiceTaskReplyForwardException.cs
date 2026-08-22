using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Process;

/// <summary>Thrown by <see cref="IServiceTaskReplyForwarder.ForwardReply"/> when a message was not accepted.</summary>
/// <remarks>
/// Only the channel that received the message knows whether to dead-letter, alert, drop or redeliver — so
/// branch on <see cref="Outcome"/> and <see cref="IsTransient"/>, and redeliver only when it could help.
/// </remarks>
public sealed class ServiceTaskReplyForwardException : AltinnException
{
    /// <summary>Why the message was not accepted.</summary>
    public ServiceTaskReplyForwardOutcome Outcome { get; }

    /// <summary>
    /// <see langword="true"/> when forwarding again could succeed. <see langword="false"/> when settled —
    /// including <see cref="ServiceTaskReplyForwardOutcome.MailboxFull"/>: the count never goes back down.
    /// </summary>
    public bool IsTransient =>
        Outcome
            is ServiceTaskReplyForwardOutcome.EngineUnavailable
                or ServiceTaskReplyForwardOutcome.SigningUnavailable;

    /// <summary>The reply address the message was forwarded to.</summary>
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
