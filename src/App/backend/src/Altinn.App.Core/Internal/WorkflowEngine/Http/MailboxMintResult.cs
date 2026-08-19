using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// The outcome of minting a mailbox: the mailbox, the engine's refusal of a request that can never
/// become valid, or the collection being at its open-mailbox cap.
/// </summary>
/// <remarks>
/// The two unsuccessful outcomes modeled here are the ones where the engine's own words are worth
/// carrying: a <c>400</c> the caller must not retry, and a <c>429</c> the caller should retry but
/// wants named the first time rather than after a ladder of bare <c>429</c>s. Everything else — an
/// engine fault, a network failure — is an ordinary transient the caller retries on, and reaches it
/// as an exception.
/// </remarks>
internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    /// <summary>
    /// The mailbox, whether this call minted it (<c>201</c>) or replayed onto the one the same
    /// idempotency key already minted (<c>200</c>). The two are deliberately not distinguished: a
    /// replay is the intended outcome of a retry, not a lesser one.
    /// </summary>
    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// The engine refused the request as invalid (<c>400</c>) — an empty or over-long idempotency
    /// key, or a timeout that is not positive or exceeds the engine's maximum. <paramref name="Detail"/>
    /// is the engine's own explanation, which names the offending value. Not retryable: the same
    /// request replays to the same refusal.
    /// </summary>
    internal sealed record Rejected(string Detail) : MailboxMintResult;

    /// <summary>
    /// The collection is at its open-mailbox cap (<c>429</c>). Retryable — the cap clears as
    /// mailboxes reach their deadlines — but modeled rather than thrown so the first failure carries
    /// the engine's <paramref name="Detail"/> (which names the collection and the cap) instead of a
    /// bare status. A <c>429</c> here means this instance already holds the maximum number of open
    /// mailboxes, so the reason is worth surfacing even though the retry decision is unchanged.
    /// </summary>
    internal sealed record AtCapacity(string Detail) : MailboxMintResult;
}
