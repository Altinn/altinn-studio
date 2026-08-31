namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly five answers, which is where "at most one execution
/// concludes, per exchange" is made structural: no member can express another's action, and no member that
/// enqueues a receiver or a segment has a path to a closure it did not name.
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
    /// A mailbox-opening stage completed while the pipeline has items composed after it: run them as the
    /// next segment, on one continuation workflow. Nothing is closed — the exchange this stage opened is
    /// still to come, and so is any exchange an earlier stage opened.
    /// </summary>
    internal sealed record ContinueAfterStage : MailboxContinuation
    {
        public ContinueAfterStage(string serviceTaskType, MailboxHandover.NextSegment segment)
        {
            ServiceTaskType = serviceTaskType;
            Segment = segment;
        }

        /// <summary>The service task whose pipeline the next segment belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The segment composed after the stage that ended this workflow's run — the plan the decide made,
        /// carried whole. Typed as the segment member alone rather than as a <see cref="MailboxHandover"/>:
        /// an opening stage contributes its own mint and stage step, so the segment after it is never the
        /// empty one a first receiver would have to stand in for.
        /// </summary>
        public MailboxHandover.NextSegment Segment { get; }
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
        public ConcludeAndContinue(Guid mailboxId, string serviceTaskType, MailboxHandover handover)
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            Handover = handover;
        }

        /// <summary>The concluded exchange's mailbox — the only one that closes here.</summary>
        public Guid MailboxId { get; }

        /// <summary>The service task whose pipeline the hand-over belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// What the pipeline runs once this exchange's mailbox is closed — the two cases as data rather than
        /// as a nullable and an implicit fallback, both decided at the verdict this continuation came from.
        /// </summary>
        public MailboxHandover Handover { get; }
    }
}

/// <summary>
/// What the pipeline runs after the item a relay hop just ran — a closed pair, decided by that hop's own
/// verdict and carried whole so nothing downstream re-derives it: the next segment exactly as it was planned
/// there, or, when that segment has no steps of its own, the next exchange's first receiver.
/// </summary>
internal abstract record MailboxHandover
{
    private MailboxHandover() { }

    /// <summary>
    /// The pipeline's next segment, planned at the decide from the resolution dispatch ran the item from.
    /// One plan, authoritative: the enqueue hop applies step options to these steps and enqueues them, and
    /// never plans again — so nothing rides on the two hops resolving <c>Define</c> to the same shape.
    /// </summary>
    internal sealed record NextSegment : MailboxHandover
    {
        public NextSegment(int afterItemIndex, ServiceTaskSegmentPlan plan)
        {
            // The one place a plan becomes a hand-over, so the one place worth stating the invariant: both
            // deciding hops refuse or reroute an empty plan before they get here, and the enqueue has no
            // verdict channel left to refuse it in — it would enqueue a workflow with no steps, which the
            // engine settles at once, emptying the frontier under an open mailbox.
            if (plan.Steps.Count == 0)
            {
                throw new ArgumentException(
                    "A hand-over to the pipeline's next segment must carry at least one step; an empty plan "
                        + "means the exchange's first receiver is the continuation, which is FirstReceiver.",
                    nameof(plan)
                );
            }

            AfterItemIndex = afterItemIndex;
            Plan = plan;
        }

        /// <summary>
        /// The item the segment follows — the reply handler that concluded its exchange, or the
        /// mailbox-opening stage that ended its own workflow. What the continuation workflow's operation id
        /// names, and where the plan was taken from.
        /// </summary>
        public int AfterItemIndex { get; }

        /// <summary>The segment's steps, with options still unresolved: the enqueue hop applies them.</summary>
        public ServiceTaskSegmentPlan Plan { get; }
    }

    /// <summary>
    /// The next exchange's first receiver, for a segment with no steps of its own (two reply handlers composed
    /// back to back): there is no continuation workflow to ride, so the receiver is enqueued directly — it
    /// <em>is</em> the pipeline's continuation. Its mailbox is resolved from the carry at the decide, where a
    /// missing entry can still fail the verdict legibly.
    /// </summary>
    /// <param name="MailboxId">The mailbox the receiver parks on.</param>
    /// <param name="HandlerItemIndex">The handler its step names.</param>
    /// <param name="OpeningStageIndex">The stage whose exchange its operation id names.</param>
    internal sealed record FirstReceiver(Guid MailboxId, int HandlerItemIndex, int OpeningStageIndex) : MailboxHandover;
}
