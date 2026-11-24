using System.Globalization;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly four answers, so no member can express another's action, and no
/// member that enqueues a receiver or the next item has a path to a closure it did not name.
/// </summary>
/// <remarks>
/// <see cref="Conclude"/> always travels with the next transition's action on the same result: the task ends, so its
/// open mailbox closes first. <see cref="MailboxRelay.Continue"/> still gates the after-workflow on that action being
/// present, so a <see cref="Conclude"/> without one closes and starts nothing.
/// </remarks>
internal abstract record MailboxContinuation
{
    private MailboxContinuation() { }

    /// <summary>Enqueue the receiver for the next message; nothing is closed or started.</summary>
    internal sealed record AwaitNextMessage : MailboxContinuation
    {
        public AwaitNextMessage(
            Guid mailboxId,
            string serviceTaskType,
            int stageIndex,
            long position,
            ProcessStepOptions? handlerStepOptions = null,
            string? handlerStepName = null
        )
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            StageIndex = stageIndex;
            Position = position;
            HandlerStepOptions = handlerStepOptions;
            HandlerStepName = handlerStepName;
        }

        /// <summary>The mailbox the replies arrive in, read from the receipt.</summary>
        public Guid MailboxId { get; }

        /// <summary>The service task whose pipeline composes the external stage.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The external stage's position in the pipeline — what the successor's step names. Sourced from the
        /// executing step's own payload, so a mid-flight reshape cannot make the successor run a different stage.
        /// </summary>
        public int StageIndex { get; }

        /// <summary>The position the handler just answered — names the successor for operators.</summary>
        public long Position { get; }

        /// <summary>
        /// The stage's own options, which its successor's step carries just as the planner's steps carry
        /// theirs; read off the pipeline by the hop that decided the continuation.
        /// </summary>
        public ProcessStepOptions? HandlerStepOptions { get; }

        /// <summary>
        /// The receive step's name, so the successor's step reads the same as this one. Worked out where the
        /// pipeline was resolved, since nothing is resolved here.
        /// </summary>
        public string? HandlerStepName { get; }
    }

    /// <summary>
    /// An item is done and nothing closes: start what follows it — an external stage's receive workflow after its
    /// send, or the next item's workflow after a stage.
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

        /// <summary>What the pipeline runs next, decided and planned at the result this came from.</summary>
        public MailboxHandover Handover { get; }
    }

    /// <summary>
    /// The task ends with a mailbox open: close it, then start the after-workflow if — and only if — the result
    /// asked the process to move on.
    /// </summary>
    internal sealed record Conclude : MailboxContinuation
    {
        public Conclude(Guid mailboxId)
        {
            MailboxId = mailboxId;
        }

        /// <summary>The open mailbox, closed before anything downstream starts.</summary>
        public Guid MailboxId { get; }
    }

    /// <summary>
    /// An external stage is done with its replies while the task carries on: close its mailbox, then start the
    /// next item's workflow. Not <see cref="Conclude"/> with a flag: what follows a closing is a shape the relay
    /// dispatches on, so no arm can drift into performing the other's move.
    /// </summary>
    internal sealed record ConcludeAndContinue : MailboxContinuation
    {
        public ConcludeAndContinue(Guid mailboxId, string serviceTaskType, MailboxHandover handover)
        {
            MailboxId = mailboxId;
            ServiceTaskType = serviceTaskType;
            Handover = handover;
        }

        /// <summary>The stage's mailbox, closed before the next item starts.</summary>
        public Guid MailboxId { get; }

        /// <summary>The service task whose pipeline the hand-over belongs to.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// What the pipeline runs once the mailbox is closed, decided and planned at the result this continuation
        /// came from.
        /// </summary>
        public MailboxHandover Handover { get; }
    }
}

/// <summary>
/// What the pipeline runs after the step a relay hop just ran: the plan that hop made, carried whole so the
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
        // The one place a plan becomes a hand-over, so the one place worth stating the invariant: the enqueue has
        // no result channel left to refuse an empty plan in — it would enqueue a workflow with no steps, which the
        // engine settles at once, emptying the frontier.
        if (plan.Steps.Count == 0)
        {
            throw new ArgumentException(
                "A hand-over must carry at least one step: the last item ends the task instead of handing over.",
                nameof(plan)
            );
        }

        // A receive workflow parks on a mailbox, so the two halves are one decision: a plan that names an
        // external stage and no target would enqueue a reply step with nothing to receive from, and a target
        // without one would park ordinary steps on a mailbox.
        if ((plan.ReceiveStageIndex is null) != (target is null))
        {
            throw new ArgumentException(
                "A receive plan's mailbox travels with it: a plan naming the external stage it receives for must be "
                    + "handed that stage's mailbox, and a plan naming none must be handed no mailbox.",
                nameof(target)
            );
        }

        // A receive workflow's one step is the reply step, and the engine resolves a workflow's mailbox
        // rendezvous for its first step only (ProcessingOrder == 0): a second step would run with none, after
        // the first had already consumed the message this workflow was parked for.
        if (target is not null && plan.Steps.Count != 1)
        {
            throw new ArgumentException(
                "A receive workflow runs exactly one step, the external stage's reply step; this plan carries "
                    + $"{plan.Steps.Count.ToString(CultureInfo.InvariantCulture)}.",
                nameof(plan)
            );
        }

        AfterItemIndex = afterItemIndex;
        Plan = plan;
        Target = target;
    }

    /// <summary>
    /// The item the plan follows — the stage that completed, or the external stage that sent or was done with its
    /// replies. What a continuation workflow's operation id names.
    /// </summary>
    public int AfterItemIndex { get; }

    /// <summary>
    /// The plan as the deciding hop made it, authoritative: the enqueue hop applies step options to these
    /// steps and enqueues them, and never plans again — so nothing rides on the two hops resolving
    /// <c>DefineExecute</c> to the same shape.
    /// </summary>
    public ServiceTaskSegmentPlan Plan { get; }

    /// <summary>
    /// The mailbox the plan's one reply step is to be parked on, or null when the plan is an ordinary
    /// continuation. Resolved from the carry at the decide, where a missing entry can still fail the step
    /// legibly.
    /// </summary>
    public MailboxTarget? Target { get; }
}

/// <summary>
/// Where a receive workflow is to be parked, named apart from the inbound <c>rendezvous</c> the engine hands a
/// receive workflow when a message arrives for it.
/// </summary>
/// <param name="MailboxId">The mailbox, resolved from the state carry at the deciding hop.</param>
/// <param name="StageIndex">The external stage that opened it — what the receiver's operation id names.</param>
internal sealed record MailboxTarget(Guid MailboxId, int StageIndex);
