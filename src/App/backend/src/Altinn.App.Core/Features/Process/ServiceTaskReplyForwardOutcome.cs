namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Why a message could not be delivered into the mailbox waiting for it. The distinction that matters
/// most is whether forwarding the same message again could ever succeed — see
/// <see cref="ServiceTaskReplyForwardException.IsTransient"/>.
/// </summary>
public enum ServiceTaskReplyForwardOutcome
{
    /// <summary>
    /// No mailbox of this app has that address — never opened here, purged long after its exchange, or an
    /// answer to a request some other system sent.
    /// </summary>
    Unroutable,

    /// <summary>
    /// Too late: the mailbox has closed and nothing will process the message. Never means "too early" — an
    /// early message is accepted and waits at its position.
    /// </summary>
    Late,

    /// <summary>Larger than the engine accepts. Store the content in Storage and forward a reference.</summary>
    PayloadTooLarge,

    /// <summary>
    /// The exchange has taken all the messages the engine allows — usually a sender looping. The room never
    /// comes back.
    /// </summary>
    MailboxFull,

    /// <summary>The submission itself was wrong (e.g. an over-long idempotency key): a code fix, not a retry.</summary>
    Rejected,

    /// <summary>The engine could not be reached; the message was not accepted. Forward again.</summary>
    EngineUnavailable,

    /// <summary>
    /// The app holds no usable callback code to seal the message with (secret unmounted or expired). Nothing
    /// was sent; the code is re-read per call, so a forward after the secret lands succeeds.
    /// </summary>
    SigningUnavailable,
}
