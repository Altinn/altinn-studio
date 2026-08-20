namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a service task opens when it declares
/// <see cref="ServiceTaskPipeline.WithReplyFrom"/>: a durable inbox the outside world can deliver
/// messages into, addressed by the id the declaring stage reads from
/// <see cref="ServiceTaskContext.Mailbox"/> and publishes as its reply address.
/// </summary>
/// <remarks>
/// The mailbox is minted when the declaring stage runs, and it carries the whole exchange's one
/// absolute deadline — stamped at that moment as <em>now plus <see cref="Timeout"/></em>. Nothing
/// re-arms it: a message that arrives after the deadline is refused, so size the timeout from how
/// long the answer may legitimately take, not from how long a single attempt may take.
/// </remarks>
public sealed record MailboxOptions
{
    /// <summary>
    /// How long the mailbox accepts messages, measured from the moment the declaring stage mints it.
    /// When it runs out the mailbox closes and the task is told so, in place of a message, so it can
    /// conclude in its own words.
    /// </summary>
    /// <remarks>
    /// Required, and required to be a real domain deadline: unlike a deferring step's wait budget
    /// there is no default to fall back on, because how long an exchange may legitimately stay open
    /// is knowledge only the task has. Days are ordinary here — an archive receipt, a counterparty's
    /// answer.
    /// <para>
    /// <strong>Two ceilings apply, and neither can be checked at app startup</strong> — both are
    /// enforced when the declaring stage opens the mailbox, so an over-long timeout surfaces as a
    /// failed transition for a user rather than as a failure to start.
    /// </para>
    /// <para>
    /// The first is the <strong>workflow engine's, 21 days by default</strong>: it lives in the
    /// engine's configuration rather than in the app, and the engine rejects the mint. Check its
    /// <c>MaxMailboxTimeout</c> before declaring more than three weeks.
    /// </para>
    /// <para>
    /// The second is usually the tighter one, and the likelier to bite: <strong>the mailbox cannot
    /// outlive this application's <c>WorkflowEngineCallback</c> app code</strong>. The workflow that
    /// receives the answer carries a callback token signed by that code, and a state blob signed by
    /// it too, so both stop being accepted the moment it expires — and app codes rotate, which means
    /// the remaining life is routinely well under three weeks even where the engine would allow it.
    /// A timeout running past that expiry fails the transition with
    /// <c>MailboxTimeoutOutlivesAppCode</c>, naming the code's expiry and its remaining life, rather
    /// than letting the exchange open and stall days later once the answer can no longer be
    /// delivered. Shorten the timeout, or put a longer-lived code <strong>first</strong> in
    /// <c>AppCodes:WorkflowEngineCallback</c> — the app signs with the first non-expired code in that
    /// list, not the longest-lived one, so appending one changes nothing.
    /// </para>
    /// </remarks>
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Throws when the declaration could never work. Called eagerly by
    /// <see cref="ServiceTaskPipeline.WithReplyFrom"/>, so a bad declaration surfaces as an app
    /// startup failure rather than as a failed transition.
    /// </summary>
    internal void Validate() =>
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(Timeout, TimeSpan.Zero, nameof(Timeout));
}
