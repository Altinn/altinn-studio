using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// The mint's outcome. Only the two refusals whose words matter are modeled; everything else reaches the
/// caller as an exception it retries on.
/// </summary>
internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    /// <summary>The mailbox — minted (<c>201</c>) or replayed (<c>200</c>), deliberately not distinguished.</summary>
    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// Refused as invalid (<c>400</c>); <paramref name="Detail"/> names the offending value. Not retryable.
    /// </summary>
    internal sealed record Rejected(string Detail) : MailboxMintResult;

    /// <summary>
    /// At the open-mailbox cap (<c>429</c>). Retryable, but modeled so the first failure carries the engine's
    /// <paramref name="Detail"/> rather than a bare status.
    /// </summary>
    internal sealed record AtCapacity(string Detail) : MailboxMintResult;
}
