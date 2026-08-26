namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly three answers, which is where "at most one execution
/// concludes, per exchange" is made structural: no member can express another's action, and the private
/// constructor keeps the set closed.
/// </summary>
/// <remarks>
/// <strong><see cref="Conclude"/> does not tell you which kind of handler produced it</strong>: a terminal
/// returns it on a success and on a permanent failure, and a mid-pipeline handler returns it on a permanent
/// failure too. What keeps an after-workflow out of a mid-pipeline handler's reach is not this type but two
/// facts outside it: the stage vocabulary has no <c>Success(action)</c>, so
/// <see cref="MailboxRelay.DecideSegment"/> never sets <c>AutoAdvanceProcess</c>; and <see cref="Conclude"/>
/// is gated on that flag in <see cref="MailboxRelay.Continue"/>, which the callback controller pins to
/// <c>false</c> on its failure branch — the only branch a mid-pipeline handler's <see cref="Conclude"/> ever
/// arrives on.
/// </remarks>
internal abstract record MailboxContinuation
{
    private MailboxContinuation(Guid mailboxId)
    {
        MailboxId = mailboxId;
    }

    public Guid MailboxId { get; }

    /// <summary>Enqueue the receiver for the next message; nothing is closed or started.</summary>
    internal sealed record AwaitNextMessage : MailboxContinuation
    {
        public AwaitNextMessage(Guid mailboxId, string serviceTaskType, int openingStageIndex, long position)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            OpeningStageIndex = openingStageIndex;
            Position = position;
        }

        /// <summary>The service task whose pipeline conclusion is the reply handler.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The stage that opened this exchange — the identity the successor names as the exchange it answers.
        /// Sourced from the executing step's own payload rather than re-derived from the pipeline, so a
        /// mid-flight reshape cannot make the successor address a different exchange or none at all.
        /// </summary>
        public int OpeningStageIndex { get; }

        /// <summary>
        /// The position the handler just answered — names the successor for operators; the successor's own
        /// position is the engine's to assign.
        /// </summary>
        public long Position { get; }
    }

    /// <summary>
    /// The exchange is over and the pipeline has nothing left to run for it: close the mailbox, then start
    /// the after-workflow if — and only if — the answer asked the process to advance.
    /// </summary>
    /// <remarks>
    /// Returned by a terminal's success or permanent failure, and by a mid-pipeline handler's permanent
    /// failure. See this type's base for why that shared use is safe.
    /// </remarks>
    internal sealed record Conclude : MailboxContinuation
    {
        public Conclude(Guid mailboxId)
            : base(mailboxId) { }
    }

    /// <summary>
    /// A mid-pipeline handler concluded <em>its</em> exchange while the task carries on: close that one
    /// mailbox, then start the pipeline's next segment.
    /// </summary>
    /// <remarks>
    /// Deliberately not <see cref="Conclude"/> with a flag: what follows a closing is then a shape the relay
    /// dispatches on rather than a field it reads, so no arm can drift into performing the other's move. It is
    /// <em>not</em> what keeps a mid-pipeline handler away from the after-workflow — see this type's base for
    /// what actually does.
    /// </remarks>
    internal sealed record ConcludeAndContinue : MailboxContinuation
    {
        public ConcludeAndContinue(Guid mailboxId, string serviceTaskType, int openingStageIndex)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            OpeningStageIndex = openingStageIndex;
        }

        /// <summary>The service task whose pipeline the next segment belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The stage that opened the exchange just concluded — the carry key the conclusion dropped, and the
        /// handler's position in the pipeline, which is where the next segment starts. Sourced from the
        /// executing step's own payload, for the reason <see cref="AwaitNextMessage.OpeningStageIndex"/> gives.
        /// </summary>
        public int OpeningStageIndex { get; }
    }
}
