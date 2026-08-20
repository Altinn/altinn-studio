using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// The outcome of minting a mailbox: the mailbox, the engine's refusal of a request that can never become valid,
/// or the collection being at its open-mailbox cap. Only those two unsuccessful outcomes are modeled, because
/// they are the ones where the engine's own words are worth carrying; everything else reaches the caller as an
/// exception it retries on.
/// </summary>
internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    /// <summary>
    /// The mailbox, whether this call minted it (<c>201</c>) or replayed onto the one the same idempotency key
    /// already minted (<c>200</c>). The two are deliberately not distinguished.
    /// </summary>
    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// The engine refused the request as invalid (<c>400</c>). <paramref name="Detail"/> is the engine's own
    /// explanation, which names the offending value. Not retryable: the same request replays to the same refusal.
    /// </summary>
    internal sealed record Rejected(string Detail) : MailboxMintResult;

    /// <summary>
    /// The collection is at its open-mailbox cap (<c>429</c>). Retryable — the cap clears as mailboxes reach their
    /// deadlines — but modeled rather than thrown so the first failure carries the engine's
    /// <paramref name="Detail"/> instead of a bare status.
    /// </summary>
    internal sealed record AtCapacity(string Detail) : MailboxMintResult;
}
