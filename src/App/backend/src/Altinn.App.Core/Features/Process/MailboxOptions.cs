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
    /// <strong>One ceiling applies, and it cannot be checked at app startup</strong>: the workflow
    /// engine's <c>MaxMailboxTimeout</c>, <strong>21 days by default</strong>. It lives in the
    /// engine's configuration rather than in the app, so the engine rejects the mint and the
    /// declaring transition fails with <c>MailboxRejected</c> — a failed transition for a user
    /// rather than a failure to start. Check that setting before declaring more than three weeks.
    /// </para>
    /// <para>
    /// Nothing else refuses a long timeout up front. What a long exchange inherits instead is a
    /// constraint belonging to long-running work in general rather than to mailboxes: <strong>a
    /// workflow's callback token and its state blob are both signed with the
    /// <c>WorkflowEngineCallback</c> app code that was current when that workflow was enqueued, and
    /// neither is ever refreshed while it waits</strong>. A workflow still waiting when the code
    /// expires fails on the callback that arrives afterwards — a mailbox handed a reply, and equally
    /// an ordinary step deferring against its wait budget. For a mailbox that failure is invisible to
    /// the sender: the engine accepts the delivery, so
    /// <see cref="IServiceTaskReplyForwarder.ForwardReply"/> succeeds and the message is consumed and
    /// never handed over again — the outside world is told the answer landed while the exchange it
    /// should have concluded fails, and neither a resume nor a freshly rotated code recovers it.
    /// Nothing measures a declaration against the code's remaining life; the exposure is bounded by
    /// rotation instead, codes being replaced far enough ahead of this cap and of the engine's wait
    /// budget that a correctly operated application never reaches it.
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
