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
    /// <strong>The ceiling is the workflow engine's, and it is 21 days by default.</strong> It is
    /// the one mistake in this declaration that app startup cannot catch, because the limit lives in
    /// the engine's configuration rather than in the app: an over-long timeout is rejected when the
    /// stage mints the mailbox, so it surfaces as a failed transition for a user rather than as a
    /// failure to start. Check the engine's <c>MaxMailboxTimeout</c> before declaring more than
    /// three weeks.
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
