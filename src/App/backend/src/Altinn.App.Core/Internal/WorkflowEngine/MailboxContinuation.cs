namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly three answers, which is where "at most one execution
/// concludes, per exchange" is made structural: no member can express another's action.
/// </summary>
/// <remarks>
/// <see cref="Conclude"/> does not say which kind of handler produced it. What keeps an after-workflow out of
/// a mid-pipeline handler's reach is two facts outside this type: the stage vocabulary has no
/// <c>Success(action)</c>, so <see cref="MailboxRelay.DecideSegment"/> never sets <c>AutoAdvanceProcess</c>;
/// and <see cref="Conclude"/> is gated on that flag in <see cref="MailboxRelay.Continue"/>, which the callback
/// controller pins to <c>false</c> on its failure branch.
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
        public AwaitNextMessage(Guid mailboxId, string serviceTaskType, int handlerItemIndex, long position)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            HandlerItemIndex = handlerItemIndex;
            Position = position;
        }

        /// <summary>The service task whose pipeline composes the reply handler.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The handler's own position in the pipeline — what the successor's step names. Sourced from the
        /// executing step's own payload, so a mid-flight reshape cannot make the successor run a different
        /// handler.
        /// </summary>
        public int HandlerItemIndex { get; }

        /// <summary>The position the handler just answered — names the successor for operators.</summary>
        public long Position { get; }
    }

    /// <summary>
    /// The exchange is over and the pipeline has nothing left to run for it: close the mailbox, then start
    /// the after-workflow if — and only if — the answer asked the process to advance.
    /// </summary>
    internal sealed record Conclude : MailboxContinuation
    {
        public Conclude(Guid mailboxId)
            : base(mailboxId) { }
    }

    /// <summary>
    /// A mid-pipeline handler concluded <em>its</em> exchange while the task carries on: close that one
    /// mailbox, then start the pipeline's next segment. Not <see cref="Conclude"/> with a flag: what follows a
    /// closing is a shape the relay dispatches on, so no arm can drift into performing the other's move.
    /// </summary>
    internal sealed record ConcludeAndContinue : MailboxContinuation
    {
        public ConcludeAndContinue(Guid mailboxId, string serviceTaskType, int handlerItemIndex, int openingStageIndex)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            HandlerItemIndex = handlerItemIndex;
            OpeningStageIndex = openingStageIndex;
        }

        /// <summary>The service task whose pipeline the next segment belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The handler's own position in the pipeline, which is where the next segment starts. Sourced from
        /// the executing step's own payload, for the reason
        /// <see cref="AwaitNextMessage.HandlerItemIndex"/> gives.
        /// </summary>
        public int HandlerItemIndex { get; }

        /// <summary>
        /// The stage that opened the exchange just concluded — the carry key the conclusion dropped, and what
        /// the continuation's operation id names. The exchange and the handler that answers it are two
        /// different positions.
        /// </summary>
        public int OpeningStageIndex { get; }
    }
}
