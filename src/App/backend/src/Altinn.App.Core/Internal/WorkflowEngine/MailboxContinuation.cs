namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly four answers, which is where "at most one execution
/// concludes, per exchange" is made structural: no member can express another's action, and neither
/// receiver-enqueueing member has a path to a closure.
/// </summary>
/// <remarks>
/// <see cref="Conclude"/> does not say which kind of step produced it. What keeps an after-workflow out of
/// a mid-pipeline handler's reach is two facts outside this type: the stage vocabulary has no
/// <c>Success(action)</c>, so <see cref="MailboxRelay.DecideSegment"/> never sets <c>AutoAdvanceProcess</c>;
/// and <see cref="Conclude"/> is gated on that flag in <see cref="MailboxRelay.Continue"/>, which the callback
/// controller pins to <c>false</c> on its failure branch.
/// </remarks>
internal abstract record MailboxContinuation
{
    private MailboxContinuation() { }

    /// <summary>
    /// Enqueue the exchange's <em>first</em> receiver — the segment that opened the mailbox is complete, so
    /// its receive leg starts. Nothing is closed or started.
    /// </summary>
    internal sealed record AwaitFirstMessage : MailboxContinuation
    {
        public AwaitFirstMessage(Guid mailboxId, string serviceTaskType, int handlerItemIndex, int openingStageIndex)
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            HandlerItemIndex = handlerItemIndex;
            OpeningStageIndex = openingStageIndex;
        }

        /// <summary>The mailbox the receiver parks on, read from the carry at the deciding step.</summary>
        public Guid MailboxId { get; }

        /// <summary>The service task whose pipeline composes the reply handler.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The handler's own position in the pipeline — what the receiver's step names. Sourced from the
        /// executing step's own payload, fixed at assembly time, so a mid-flight reshape cannot make the
        /// receiver run a different handler.
        /// </summary>
        public int HandlerItemIndex { get; }

        /// <summary>The stage that opened the exchange — what the receiver's operation id names.</summary>
        public int OpeningStageIndex { get; }
    }

    /// <summary>Enqueue the receiver for the next message; nothing is closed or started.</summary>
    internal sealed record AwaitNextMessage : MailboxContinuation
    {
        public AwaitNextMessage(Guid mailboxId, string serviceTaskType, int handlerItemIndex, long position)
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            HandlerItemIndex = handlerItemIndex;
            Position = position;
        }

        /// <summary>The mailbox the exchange runs on, read from the rendezvous.</summary>
        public Guid MailboxId { get; }

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
    /// The task is over and the pipeline has nothing left to run: close every named mailbox, then start
    /// the after-workflow if — and only if — the answer asked the process to advance. One mailbox when a
    /// reply handler concluded its exchange; every mailbox the carry still held when a mailbox-opening
    /// stage concluded the whole task.
    /// </summary>
    internal sealed record Conclude : MailboxContinuation
    {
        public Conclude(IReadOnlyList<Guid> mailboxIds)
        {
            MailboxIds = mailboxIds;
        }

        /// <summary>Closed in order, all of them before anything downstream starts.</summary>
        public IReadOnlyList<Guid> MailboxIds { get; }
    }

    /// <summary>
    /// A mid-pipeline handler concluded <em>its</em> exchange while the task carries on: close that one
    /// mailbox, then start the pipeline's next segment. Not <see cref="Conclude"/> with a flag: what follows a
    /// closing is a shape the relay dispatches on, so no arm can drift into performing the other's move.
    /// </summary>
    internal sealed record ConcludeAndContinue : MailboxContinuation
    {
        public ConcludeAndContinue(
            Guid mailboxId,
            string serviceTaskType,
            int handlerItemIndex,
            int openingStageIndex,
            ResolvedFirstReceiver? nextReceiver = null
        )
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            HandlerItemIndex = handlerItemIndex;
            OpeningStageIndex = openingStageIndex;
            NextReceiver = nextReceiver;
        }

        /// <summary>
        /// The next exchange's first receiver, non-null exactly when the pipeline's next segment has no
        /// steps of its own (two reply handlers composed back to back): there is no continuation workflow to
        /// ride, so the receiver is enqueued directly — it <em>is</em> the pipeline's continuation. Resolved
        /// from the carry at decide time, where a missing entry can still fail the verdict legibly.
        /// </summary>
        public ResolvedFirstReceiver? NextReceiver { get; }

        /// <summary>The concluded exchange's mailbox — the only one that closes here.</summary>
        public Guid MailboxId { get; }

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

/// <summary>
/// A first receiver as <see cref="MailboxContinuation.ConcludeAndContinue.NextReceiver"/> carries one: the
/// mailbox it parks on and the two positions every receiver needs — the handler its step names, and the
/// stage whose exchange its operation id names.
/// </summary>
internal sealed record ResolvedFirstReceiver(Guid MailboxId, int HandlerItemIndex, int OpeningStageIndex);
