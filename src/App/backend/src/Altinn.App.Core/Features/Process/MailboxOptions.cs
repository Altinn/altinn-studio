namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a service task opens when it declares <see cref="ServiceTaskPipeline.WithReplyFrom"/>: a durable
/// inbox the outside world can deliver messages into, addressed by the id the declaring stage reads from
/// <see cref="ServiceTaskContext.Mailbox"/> and publishes as its reply address. It is minted when the declaring
/// stage runs and carries the exchange's one absolute deadline, stamped then as <em>now plus
/// <see cref="Timeout"/></em>; nothing re-arms it.
/// </summary>
public sealed record MailboxOptions
{
    /// <summary>
    /// How long the mailbox accepts messages, measured from the moment the declaring stage mints it. When it runs
    /// out the mailbox closes and the task is told so, in place of a message, so it can conclude in its own words.
    /// </summary>
    /// <remarks>
    /// Required, and required to be a real domain deadline: how long an exchange may legitimately stay open is
    /// knowledge only the task has. Days are ordinary here.
    /// <para>
    /// One ceiling applies and cannot be checked at app startup: the workflow engine's <c>MaxMailboxTimeout</c>,
    /// 21 days by default. The engine rejects the mint and the declaring transition fails with
    /// <c>MailboxRejected</c>, so check that setting before declaring more than three weeks.
    /// </para>
    /// <para>
    /// A long exchange also inherits a constraint belonging to long-running work in general: a workflow's callback
    /// token and its state blob are both signed with the <c>WorkflowEngineCallback</c> app code current when it was
    /// enqueued, and neither is refreshed while it waits. For a mailbox that failure is invisible to the sender —
    /// the engine accepts the delivery, so the message is consumed and never handed over again. Nothing measures a
    /// declaration against the code's remaining life; the exposure is bounded by rotation instead.
    /// </para>
    /// </remarks>
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Throws when the declaration could never work. Called eagerly by
    /// <see cref="ServiceTaskPipeline.WithReplyFrom"/>, so a bad declaration surfaces as an app startup failure.
    /// </summary>
    internal void Validate() =>
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(Timeout, TimeSpan.Zero, nameof(Timeout));
}
