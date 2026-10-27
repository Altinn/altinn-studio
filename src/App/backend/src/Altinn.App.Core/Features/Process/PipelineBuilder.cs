namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a pipeline, the one way for every kind of task: zero or more
/// <see cref="Stage(Func{StageContext, Task{StageResult}}, ProcessStepOptions?)"/> calls and
/// <see cref="HandleReplies"/> handlers, in any order, ended by exactly one terminal. A service task composes
/// inside <see cref="IServiceTask.DefineExecute"/> and ends with a conclusion, <see cref="Finally"/> or
/// <see cref="ConcludeOnReplies"/>, the only sources of the <see cref="ServiceTaskPipeline"/> that <c>DefineExecute</c>
/// must return. A process task composes the work it does when a task starts, ends or is abandoned inside
/// <see cref="Internal.Process.ProcessTasks.IProcessTask.DefineStart"/>, <c>DefineEnd</c> or <c>DefineAbandon</c>
/// and ends with <see cref="Build"/>: those stages run inside the transition and never advance the process, so
/// there is no conclusion, and no mailbox either. Composition mistakes throw from the composing call and fail app
/// startup. Authoring guidance: <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </summary>
public sealed class PipelineBuilder
{
    private readonly List<PipelineItem> _items = [];

    /// <summary>
    /// The mailboxes this builder has issued handles for, each carrying what answers it. A fresh builder per
    /// <c>DefineExecute</c> call, so this is one pipeline's whole set.
    /// </summary>
    private readonly List<IssuedMailbox> _mailboxes = [];

    /// <summary>
    /// Not constructible by apps: a <c>DefineExecute</c> spreading its composition over two builders could lose a
    /// mailbox declaration made on the one it did not return from.
    /// </summary>
    internal PipelineBuilder() { }

    /// <summary>
    /// Adds a durable stage, executed in composition order before the pipeline's conclusion. A completed
    /// stage never runs again; a retry or resume re-enters the pipeline at the failed stage.
    /// </summary>
    /// <param name="work">
    /// The stage's work. <strong>MUST be idempotent — it may be retried on failure</strong>; use
    /// <see cref="StageContext.StepId"/> as the idempotency key for calls the stage must not repeat.
    /// </param>
    /// <param name="options">
    /// Optional execution options for the step this stage runs as: its timeout, retry strategy and wait budget.
    /// A field left unset falls back to the command's default and then the engine's.
    /// </param>
    public PipelineBuilder Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();
        _items.Add(new PipelineStage.Plain(work, options));
        return this;
    }

    /// <summary>
    /// Adds a durable stage that <strong>opens a mailbox</strong>: a durable inbox whose id the stage
    /// publishes as its reply address. Every message that comes back runs the handler that answers
    /// <paramref name="handle"/>. Otherwise an ordinary stage — except that its vocabulary,
    /// <see cref="ServiceTaskOpeningStageResult"/>, adds
    /// <see cref="ServiceTaskOpeningStageResult.Conclude"/> for the send whose failure already settles the
    /// task (see that member's remarks).
    /// </summary>
    /// <param name="work">The stage's work, handed the mailbox it opened.</param>
    /// <param name="mailbox">How long the mailbox accepts messages.</param>
    /// <param name="handle">
    /// The opened mailbox, to be passed to <see cref="HandleReplies"/> or <see cref="ConcludeOnReplies"/> —
    /// exactly once.
    /// </param>
    /// <param name="options">Optional per-stage execution options, as above.</param>
    public PipelineBuilder Stage(
        Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> work,
        MailboxOptions mailbox,
        out MailboxHandle handle,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        ArgumentNullException.ThrowIfNull(mailbox);
        mailbox.Validate();
        options?.Validate();
        int openingIndex = _items.Count;
        _items.Add(new PipelineStage.MailboxOpening(work, mailbox, options));

        handle = new MailboxHandle(this, openingIndex);
        _mailboxes.Add(new IssuedMailbox(handle));
        return this;
    }

    /// <summary>
    /// Answers the exchange on the mailbox <paramref name="handle"/> names <strong>without concluding the
    /// task</strong>: <paramref name="onMessage"/> runs once per message until it says the exchange is over,
    /// and then the pipeline carries on with whatever is composed after this call.
    /// </summary>
    /// <param name="handle">The mailbox this handler answers, from the stage that opened it.</param>
    /// <param name="onMessage">
    /// Answers one message: <see cref="StageExchangeResult.AwaitNextReply"/> to be called again on
    /// the next one, <see cref="StageResult.Completed"/> to end the exchange and let the pipeline
    /// continue.
    /// </param>
    /// <param name="onClosed">
    /// Answers the mailbox closing with the exchange unfinished — fatal
    /// (<see cref="StageResult.FailedPermanent"/>), or simply the end of an exchange the task can
    /// live without (<see cref="StageResult.Completed"/>).
    /// </param>
    /// <param name="options">Optional execution options for the step each execution of these handlers runs as.</param>
    /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
    /// <exception cref="InvalidOperationException"><paramref name="handle"/> is already answered.</exception>
    public PipelineBuilder HandleReplies(
        MailboxHandle handle,
        Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage,
        Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(onMessage);
        ArgumentNullException.ThrowIfNull(onClosed);
        options?.Validate();

        ClaimMailbox(handle, MailboxAnswer.Segment);
        _items.Add(new ReplySegment(handle.OpeningIndex, onMessage, onClosed, options));
        return this;
    }

    /// <summary>
    /// Ends a process task's lifecycle pipeline, which has no conclusion: its stages run inside the transition
    /// into or out of the task and never advance the process. A pipeline that opened a mailbox cannot end here,
    /// since only a service task's conclusion can answer it.
    /// </summary>
    public Pipeline Build()
    {
        if (_mailboxes.Count > 0)
        {
            throw new InvalidOperationException(
                $"The pipeline opens a mailbox, so it cannot end with {nameof(Build)}: a reply is answered after the "
                    + "transition commits, which only a service task's conclusion does. Compose it for a service task "
                    + $"and end it with {nameof(ConcludeOnReplies)} or {nameof(Finally)}, or compose plain stages only "
                    + "for the work a task does when it starts, ends or is abandoned."
            );
        }

        return new Pipeline([.. _items.Select(item => (PipelineStage.Plain)item)]);
    }

    /// <summary>
    /// Ends the pipeline with its conclusion — the one step that decides how the task concludes, executed
    /// once everything composed before it has finished. For a polling pipeline this is where the wait lives:
    /// return <see cref="ServiceTaskResult.Defer"/> until the outcome arrives.
    /// </summary>
    /// <param name="work">
    /// The concluding work. The idempotency rules of
    /// <see cref="Stage(Func{StageContext, Task{StageResult}}, ProcessStepOptions?)"/>
    /// apply here too.
    /// </param>
    /// <param name="options">
    /// Optional execution options for the concluding step alone. A polling pipeline declares its
    /// <see cref="ProcessStepOptions.WaitBudget"/> here, on the step that waits.
    /// </param>
    /// <exception cref="InvalidOperationException">
    /// A mailbox this pipeline opens is left unanswered.
    /// </exception>
    public ServiceTaskPipeline Finally(
        Func<StageContext, Task<ServiceTaskResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();

        RequireEveryMailboxAnswered(nameof(Finally), answeredHere: null);

        return new ServiceTaskPipeline(_items, new PipelineConclusion.FinalStep(work, options));
    }

    /// <summary>
    /// Ends the pipeline with the exchange on the mailbox <paramref name="handle"/> names:
    /// <paramref name="onMessage"/> runs once per message until it concludes the task or the mailbox's
    /// timeout runs out. Concluding closes the mailbox first, so no later message can land in an exchange
    /// already answered.
    /// </summary>
    /// <param name="handle">The mailbox this terminal answers, from the stage that opened it.</param>
    /// <param name="onMessage">Answers one message: conclude the task, or await the next.</param>
    /// <param name="onClosed">
    /// Answers the mailbox closing with the task still unconcluded. It cannot ask for another message.
    /// </param>
    /// <param name="options">
    /// Optional execution options for the step each execution of these handlers runs as. A
    /// <see cref="ProcessStepOptions.WaitBudget"/> here bounds the handler's own deferrals per message — not
    /// the wait for a message, which is <see cref="MailboxOptions.Timeout"/>.
    /// </param>
    /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
    /// <exception cref="InvalidOperationException">
    /// <paramref name="handle"/> is already answered, or another mailbox this pipeline opens is left
    /// unanswered.
    /// </exception>
    public ServiceTaskPipeline ConcludeOnReplies(
        MailboxHandle handle,
        Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
        Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(onMessage);
        ArgumentNullException.ThrowIfNull(onClosed);
        options?.Validate();

        ClaimMailbox(handle, MailboxAnswer.Terminal);
        RequireEveryMailboxAnswered(nameof(ConcludeOnReplies), answeredHere: handle);

        return new ServiceTaskPipeline(
            _items,
            new PipelineConclusion.ReplyExchange(handle.OpeningIndex, onMessage, onClosed, options)
        );
    }

    /// <summary>
    /// Claims the mailbox <paramref name="handle"/> names for the handler being composed: the two things the
    /// type system cannot say — that the handle came from this builder, and that nothing answers it yet.
    /// </summary>
    private void ClaimMailbox(MailboxHandle handle, MailboxAnswer answer)
    {
        if (!ReferenceEquals(handle.Owner, this))
        {
            throw new ArgumentException(
                $"The mailbox opened at index {handle.OpeningIndex} belongs to another task's pipeline, so "
                    + "this one cannot answer it. Pass the handle handed out by this pipeline's own mailbox-opening "
                    + "stage.",
                nameof(handle)
            );
        }

        // Owned by this builder, so this builder issued it, so it is registered.
        IssuedMailbox mailbox = _mailboxes.Single(m => ReferenceEquals(m.Handle, handle));
        if (mailbox.Answer is not MailboxAnswer.None)
        {
            throw new InvalidOperationException(
                $"The mailbox opened at index {handle.OpeningIndex} is already answered by an earlier "
                    + $"handler. Each mailbox is answered exactly once — by {nameof(HandleReplies)} or by "
                    + $"{nameof(ConcludeOnReplies)}, never by both and never twice — so a second handler for the "
                    + "same exchange would be dead code."
            );
        }

        mailbox.Answer = answer;
    }

    /// <summary>
    /// The completeness check both terminals run: a terminal is the end of the composition, so a mailbox
    /// still waiting for its handler here is waiting for a call that will never be made. An earlier
    /// terminal's answer does not count — it belongs to the pipeline that terminal returned.
    /// </summary>
    private void RequireEveryMailboxAnswered(string terminal, MailboxHandle? answeredHere)
    {
        IssuedMailbox? unanswered = _mailboxes.FirstOrDefault(m =>
            m.Answer is not MailboxAnswer.Segment && !ReferenceEquals(m.Handle, answeredHere)
        );
        if (unanswered is null)
        {
            return;
        }

        int openingIndex = unanswered.Handle.OpeningIndex;
        throw new InvalidOperationException(
            unanswered.Answer is MailboxAnswer.Terminal
                ? $"The mailbox opened at index {openingIndex} is answered by an earlier {nameof(ConcludeOnReplies)}, but "
                    + $"that answer is the conclusion of the pipeline that call returned — and this {terminal} "
                    + "returns a different pipeline, in which nothing answers it. A DefineExecute composes one terminal "
                    + "and returns it; two terminals on one builder are two pipelines, and the one left behind "
                    + "takes its exchange's answer with it."
                : $"A mailbox is opened at index {openingIndex}, but nothing answers it, and this pipeline ends "
                    + $"here with {terminal}: the messages that come back would have no handler, and nothing in "
                    + $"this pipeline would ever read them. Answer it before the pipeline ends — with "
                    + $"{nameof(HandleReplies)} to carry on afterwards, or with {nameof(ConcludeOnReplies)} to end "
                    + "there — passing the handle the stage handed out."
        );
    }

    /// <summary>One mailbox this builder issued a handle for, and what answers it.</summary>
    private sealed class IssuedMailbox(MailboxHandle handle)
    {
        internal MailboxHandle Handle { get; } = handle;

        internal MailboxAnswer Answer { get; set; }
    }

    /// <summary>What answers a mailbox — and, for a terminal, where that answer lives.</summary>
    private enum MailboxAnswer
    {
        None,

        /// <summary>
        /// A <see cref="HandleReplies"/> handler answers it — an item, traveling with every pipeline this
        /// builder can still return.
        /// </summary>
        Segment,

        /// <summary>
        /// A terminal answers it, and that answer is the conclusion of the one pipeline that terminal
        /// returned.
        /// </summary>
        Terminal,
    }
}
