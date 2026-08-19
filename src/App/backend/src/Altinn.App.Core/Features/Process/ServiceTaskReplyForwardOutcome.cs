namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Why a message could not be delivered into the mailbox waiting for it. The distinction that matters
/// most is whether forwarding the same message again could ever succeed — see
/// <see cref="ServiceTaskReplyForwardException.IsTransient"/>.
/// </summary>
public enum ServiceTaskReplyForwardOutcome
{
    /// <summary>
    /// No mailbox of this app has that address: it was never opened here, or it has been purged long
    /// after its exchange ended. Usually a mismatch between the address embedded in the outbound request
    /// and the value read back out of the answer — or an answer to a request some other system sent.
    /// </summary>
    Unroutable,

    /// <summary>
    /// The message arrived too late: the mailbox has been closed — by the task concluding its exchange,
    /// by an operator, or by the exchange's deadline passing. Nothing is waiting for it and nothing will
    /// process it. Never means "too early" — a message that arrives before its receiver exists is
    /// accepted and simply waits at its position.
    /// </summary>
    Late,

    /// <summary>
    /// The message is larger than the workflow engine accepts. Store the content in Storage and forward
    /// a reference to it instead.
    /// </summary>
    PayloadTooLarge,

    /// <summary>
    /// The mailbox has already taken as many messages as the workflow engine allows one exchange to
    /// take. Usually a sender looping. The count includes messages already handled, so the room does not
    /// come back: this exchange will accept nothing further, whatever happens to the messages in it.
    /// </summary>
    MailboxFull,

    /// <summary>
    /// The submission itself was wrong, rather than its timing or its target — so forwarding the same
    /// message again produces the same result. The workflow engine rejected it, for example because the
    /// idempotency key is longer than it accepts. It needs a code fix, not a retry.
    /// </summary>
    Rejected,

    /// <summary>
    /// The workflow engine could not be reached, or failed while accepting the message. The message was
    /// not accepted, and forwarding it again is the right response.
    /// </summary>
    EngineUnavailable,

    /// <summary>
    /// The app itself could not seal the message for transport, because it currently holds no usable
    /// workflow callback code — the secret is not mounted yet, or every code in it has expired.
    /// Nothing was sent. The code is re-read on every call, so a forward that follows the secret
    /// landing succeeds; a persistent one is a deployment problem to alert on.
    /// </summary>
    SigningUnavailable,
}
