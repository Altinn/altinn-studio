using System.Globalization;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly four answers, which is where "at most one execution
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
    /// A stage that was its workflow's last step completed: start what the pipeline composes after it — the
    /// receive leg of the exchange the handler composed next answers, or otherwise the workflow carrying the
    /// items that are composed next. Which exchange that is belongs to the handler, not to this stage: on
    /// up-front sends the stage that just sent opened a <em>later</em> exchange than the one the handler after
    /// it answers. Nothing is closed: no exchange of this task has been answered here, neither one this stage
    /// opened nor one an earlier stage did.
    /// </summary>
    internal sealed record ContinueAfterStage : MailboxContinuation
    {
        public ContinueAfterStage(string serviceTaskType, MailboxHandover handover)
        {
            ServiceTaskType = serviceTaskType;
            Handover = handover;
        }

        /// <summary>The service task whose pipeline the hand-over belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>What the pipeline runs next, decided and planned at the verdict this came from.</summary>
        public MailboxHandover Handover { get; }
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
        /// What the pipeline runs once this exchange's mailbox is closed, decided and planned at the verdict
        /// this continuation came from.
        /// </summary>
        public MailboxHandover Handover { get; }
    }
}

/// <summary>
/// What the pipeline runs after the item a relay hop just ran: the plan that hop made, carried whole so the
/// enqueue re-derives nothing, plus — when the plan is a receive workflow — the mailbox it parks on. One
/// shape rather than a pair, because the difference between a receive workflow and a continuation is one the
/// enqueue must read anyway (a mailbox to park on, and its own operation id naming) and nothing else
/// dispatches on. The three guards below are what that collapse costs and pays for: a pair could not express
/// the disagreements they refuse, so they are stated here rather than left to the planner in another file.
/// </summary>
internal sealed record MailboxHandover
{
    public MailboxHandover(int afterItemIndex, ServiceTaskSegmentPlan plan, MailboxTarget? target)
    {
        // The one place a plan becomes a hand-over, so the one place worth stating the invariant: the deciding
        // hop refuses an empty plan before it gets here, and the enqueue has no verdict channel left to refuse
        // it in — it would enqueue a workflow with no steps, which the engine settles at once, emptying the
        // frontier under an open mailbox.
        if (plan.Steps.Count == 0)
        {
            throw new ArgumentException(
                "A hand-over must carry at least one step: an empty plan means the pipeline composes nothing "
                    + "after the item the deciding hop ran, which that hop refuses.",
                nameof(plan)
            );
        }

        // A receive workflow parks on a mailbox, so the two halves are one decision: a plan that names an
        // exchange and no target would enqueue a handler step with nothing to receive from, and a target
        // without one would park ordinary steps on a mailbox.
        if ((plan.ReceiveOpeningIndex is null) != (target is null))
        {
            throw new ArgumentException(
                "A receive plan's mailbox travels with it: a plan naming the exchange it answers must be "
                    + "handed the mailbox that exchange runs on, and a plan naming none must be handed no "
                    + "mailbox.",
                nameof(target)
            );
        }

        // A receive workflow's one step is the handler, and the engine resolves a workflow's mailbox
        // rendezvous for its first step only (ProcessingOrder == 0): a second step would run with none, after
        // the first had already consumed the message this workflow was parked for.
        if (target is not null && plan.Steps.Count != 1)
        {
            throw new ArgumentException(
                "A receive workflow runs exactly one step, the reply handler that answers its exchange; this "
                    + $"plan carries {plan.Steps.Count.ToString(CultureInfo.InvariantCulture)}.",
                nameof(plan)
            );
        }

        AfterItemIndex = afterItemIndex;
        Plan = plan;
        Target = target;
    }

    /// <summary>
    /// The item the plan follows — the reply handler that concluded its exchange, or the stage that was its
    /// own workflow's last step. What a continuation workflow's operation id names.
    /// </summary>
    public int AfterItemIndex { get; }

    /// <summary>
    /// The plan as the deciding hop made it, authoritative: the enqueue hop applies step options to these
    /// steps and enqueues them, and never plans again — so nothing rides on the two hops resolving
    /// <c>Define</c> to the same shape.
    /// </summary>
    public ServiceTaskSegmentPlan Plan { get; }

    /// <summary>
    /// The exchange the plan's one handler step is to be parked on, or null when the plan is an ordinary
    /// continuation. Resolved from the carry at the decide, where a missing entry can still fail the verdict
    /// legibly.
    /// </summary>
    public MailboxTarget? Target { get; }
}

/// <summary>
/// Where a receive workflow is to be parked — the outbound half of an exchange's identity, named apart from
/// the inbound <c>rendezvous</c> the engine hands a receive workflow when a message arrives for it.
/// </summary>
/// <param name="MailboxId">The mailbox, resolved from the state carry at the deciding hop.</param>
/// <param name="OpeningStageIndex">The stage that opened it — what the receiver's operation id names.</param>
internal sealed record MailboxTarget(Guid MailboxId, int OpeningStageIndex);
