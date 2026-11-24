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
/// What the pipeline runs after the step a relay hop just ran: the steps that hop planned, carried whole so the
/// enqueue re-derives nothing, and for a receive workflow the mailbox it parks on.
/// </summary>
internal sealed record MailboxHandover
{
    /// <summary>
    /// Hands over to the workflow of the next item.
    /// </summary>
    public MailboxHandover(int afterItemIndex, IReadOnlyList<PlannedStep> steps)
    {
        AfterItemIndex = afterItemIndex;
        Steps = steps;
    }

    /// <summary>
    /// Hands over to a receive workflow: the reply step alone, parked on the external stage's mailbox. Alone because
    /// the engine hands the mailbox receipt to a workflow's first step only, so a second step would run without it,
    /// as the send.
    /// </summary>
    public MailboxHandover(int afterItemIndex, PlannedStep replyStep, MailboxTarget target)
    {
        AfterItemIndex = afterItemIndex;
        Steps = [replyStep];
        Target = target;
    }

    /// <summary>
    /// The item the steps follow — the stage that completed, or the external stage that sent or was done with its
    /// replies. What a continuation workflow's operation id names.
    /// </summary>
    public int AfterItemIndex { get; }

    /// <summary>
    /// The steps as the deciding hop planned them, authoritative: the enqueue hop applies step options to them and
    /// enqueues them, and never plans again — so nothing rides on the two hops resolving <c>DefineExecute</c> to the
    /// same shape.
    /// </summary>
    public IReadOnlyList<PlannedStep> Steps { get; }

    /// <summary>
    /// The mailbox the one reply step is to be parked on, or null when the steps are an ordinary continuation.
    /// Resolved from the carry at the decide, where a missing entry can still fail the step legibly.
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
