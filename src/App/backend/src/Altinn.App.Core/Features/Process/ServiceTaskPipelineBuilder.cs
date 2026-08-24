namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a service task's pipeline inside <see cref="IPipelineServiceTask.Define"/>: zero or
/// more <see cref="Stage(string, Func{ServiceTaskContext, Task{ServiceTaskStageResult}}, ProcessStepOptions?)"/>
/// calls and <see cref="HandleReplies"/> handlers, in any order, ended by exactly one terminal —
/// <see cref="Finally"/> or <see cref="ConcludeOnReplies"/>. The types enforce the shape: a terminal is the
/// only way to obtain the <see cref="ServiceTaskPipeline"/> that <c>Define</c> must return.
/// </summary>
/// <remarks>
/// The builder validates eagerly: an empty or duplicate stage name, a null work delegate, invalid
/// <see cref="ProcessStepOptions"/>, a mailbox handle from another pipeline, a handle answered twice, and a
/// mailbox still unanswered when a terminal ends the composition all throw from the composing call itself,
/// which surfaces as an app startup failure when the pipeline is validated.
/// </remarks>
public sealed class ServiceTaskPipelineBuilder
{
    private readonly List<PipelineItem> _items = [];

    /// <summary>
    /// The mailboxes this builder has issued handles for, in the order the stages that opened them were
    /// composed, each carrying what answers it. A fresh builder per <c>Define</c> call, so this is one
    /// pipeline's whole set.
    /// </summary>
    private readonly List<IssuedMailbox> _mailboxes = [];

    /// <summary>
    /// Not constructible by apps: the eager checks — and the declarations they are about — belong to the
    /// builder whose terminal produced the returned pipeline, so a <c>Define</c> spreading its composition
    /// over two builders could lose a mailbox declaration made on the one it did not return from.
    /// </summary>
    internal ServiceTaskPipelineBuilder() { }

    /// <summary>
    /// Adds a durable stage, executed in composition order before the pipeline's conclusion. The
    /// stage runs as its own workflow-engine step and never runs again once it reports
    /// <see cref="ServiceTaskStageResult.Completed"/>; a retry or resume re-enters the pipeline at
    /// the failed stage.
    /// </summary>
    /// <param name="name">
    /// The stage's identity — in the engine's records, and how a callback finds its way back to
    /// this stage. Printable ASCII only (it travels in HTTP header values). <strong>A
    /// compatibility surface for in-flight workflows:</strong> a workflow enqueued with this
    /// stage keeps calling back by name until it settles. Renaming the work method is free; this
    /// literal is what must not drift.
    /// </param>
    /// <param name="work">
    /// The stage's work. <strong>MUST be idempotent — it may be retried on failure.</strong> Use
    /// <see cref="ServiceTaskContext.StepId"/> as the idempotency key for an outbound call the
    /// stage must not repeat. Data changes via <see cref="ServiceTaskContext.InstanceDataMutator"/>
    /// are saved when the stage completes; a deferring attempt saves nothing.
    /// </param>
    /// <param name="options">
    /// Optional per-stage execution options (timeout, retry strategy, wait budget) for the engine
    /// step this stage becomes, winning field-wise over the task's own
    /// <see cref="IProcessStepConfigurable.StepOptions"/>.
    /// </param>
    public ServiceTaskPipelineBuilder Stage(
        string name,
        Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        ValidateStage(name, options);
        _items.Add(new ServiceTaskStage.Plain(name, work, options));
        return this;
    }

    /// <summary>
    /// Adds a durable stage that <strong>opens a mailbox</strong>: a durable inbox whose id the stage
    /// publishes as its reply address, handed to <paramref name="work"/> as a
    /// <see cref="ServiceTaskMailbox"/>. Every message that comes back runs the handler that answers
    /// <paramref name="handle"/>. Otherwise an ordinary stage, with the same rules as
    /// <see cref="Stage(string, Func{ServiceTaskContext, Task{ServiceTaskStageResult}}, ProcessStepOptions?)"/>.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The declaration and the mailbox-aware delegate travel together because the address exists for the
    /// sake of the message this stage sends: the stage that sends is the stage that publishes the address,
    /// and the mailbox's deadline starts when this stage's mint runs. That mint is its own durable step,
    /// immediately before this one — so a retried or deferred attempt of this stage is handed the same
    /// mailbox rather than opening a second, and no earlier stage spends the exchange's deadline.
    /// </para>
    /// <para>
    /// For an answer to be routable, <paramref name="work"/> must publish
    /// <see cref="ServiceTaskMailbox.Id"/> in whatever field the receiving system echoes back, and the
    /// subscriber that sees the echo forwards the message with
    /// <see cref="IServiceTaskReplyForwarder"/>. Nothing else routes it: the id <em>is</em> the address.
    /// </para>
    /// <para>
    /// <strong>A task may open several mailboxes</strong>, each answered by exactly one handler:
    /// <see cref="HandleReplies"/> for an exchange the pipeline carries on after, or
    /// <see cref="ConcludeOnReplies"/> for the one it ends on.
    /// </para>
    /// </remarks>
    /// <param name="name">The stage's wire identity, as above — and the exchange's identity too.</param>
    /// <param name="work">The stage's work, handed the mailbox it opened.</param>
    /// <param name="mailbox">How long the mailbox accepts messages.</param>
    /// <param name="handle">
    /// The opened mailbox, to be passed to <see cref="HandleReplies"/> or <see cref="ConcludeOnReplies"/> —
    /// exactly once.
    /// </param>
    /// <param name="options">Optional per-stage execution options, as above.</param>
    public ServiceTaskPipelineBuilder Stage(
        string name,
        Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>> work,
        MailboxOptions mailbox,
        out MailboxHandle handle,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        ArgumentNullException.ThrowIfNull(mailbox);
        mailbox.Validate();
        ValidateStage(name, options);
        _items.Add(new ServiceTaskStage.MailboxOpening(name, work, mailbox, options));

        handle = new MailboxHandle(this, name);
        _mailboxes.Add(new IssuedMailbox(handle));
        return this;
    }

    /// <summary>
    /// Answers the exchange on the mailbox <paramref name="handle"/> names <strong>without concluding the
    /// task</strong>: <paramref name="onMessage"/> runs once per message, each as its own durable unit of
    /// work, until it says the exchange is over — and then the pipeline carries on with whatever is composed
    /// after this call.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The non-terminal sibling of <see cref="ConcludeOnReplies"/>: the same exchange, executed the same way,
    /// with a different vocabulary. <see cref="ServiceTaskStageResult.Completed"/> reads in its plain sense —
    /// <em>this exchange is done, run the rest of the pipeline</em> — and concluding the task or advancing the
    /// process are not in that vocabulary at all; they belong to the terminal.
    /// </para>
    /// <para>
    /// Exchanges run one at a time, in the order their <em>handlers</em> are composed rather than the order
    /// their sends are: <c>Stage(A) → Stage(B) → HandleReplies(A) → ConcludeOnReplies(B)</c> sends both
    /// messages up front and still reads A's exchange to the end before B's begins. Messages for a later
    /// exchange wait in its mailbox until the pipeline reaches its handler — never lost, and never handled
    /// early.
    /// </para>
    /// <para>
    /// Each mailbox's <see cref="MailboxOptions.Timeout"/> runs from the moment its own stage opened it, which
    /// is what makes stage placement a real decision: a send composed before this handler spends its deadline
    /// while this exchange runs, and a send composed after it starts its clock once this exchange is over.
    /// </para>
    /// <para>
    /// A failure here fails the task exactly as a stage's would, and closes only this exchange's mailbox: any
    /// later mailbox already open waits out its own deadline, so a resume can replay this handler and carry
    /// the chain on.
    /// </para>
    /// </remarks>
    /// <param name="handle">The mailbox this handler answers, from the stage that opened it.</param>
    /// <param name="onMessage">
    /// Answers one message: <see cref="ServiceTaskStageExchangeResult.AwaitNextReply"/> to be called again on
    /// the next one, <see cref="ServiceTaskStageResult.Completed"/> to end the exchange and let the pipeline
    /// continue.
    /// </param>
    /// <param name="onClosed">
    /// Answers the mailbox closing with the exchange unfinished — the deadline passed, or it was closed by
    /// hand. It cannot ask for another message, and it decides whether that is fatal
    /// (<see cref="ServiceTaskStageResult.FailedPermanent"/>) or simply the end of an exchange the task can
    /// live without (<see cref="ServiceTaskStageResult.Completed"/>, and the pipeline carries on).
    /// </param>
    /// <param name="options">
    /// Optional execution options for the step each execution of these handlers runs as, meaning exactly what
    /// they mean on <see cref="ConcludeOnReplies"/>.
    /// </param>
    /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
    /// <exception cref="InvalidOperationException"><paramref name="handle"/> is already answered.</exception>
    public ServiceTaskPipelineBuilder HandleReplies(
        MailboxHandle handle,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> onClosed,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(onMessage);
        ArgumentNullException.ThrowIfNull(onClosed);
        options?.Validate();

        ClaimMailbox(handle, MailboxAnswer.Segment);
        _items.Add(new ReplySegment(handle.OpeningStageName, onMessage, onClosed, options));
        return this;
    }

    /// <summary>
    /// Ends the pipeline with its conclusion — the one step that decides how the task concludes
    /// (success, auto-advance action, park, defer, failure), executed once everything composed before
    /// it has finished. For a polling pipeline this is where the wait lives: return
    /// <see cref="ServiceTaskResult.Defer"/> until the outcome arrives, bounded by the task's
    /// <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="work">
    /// The concluding work. The idempotency and state-saving rules of
    /// <see cref="Stage(string, Func{ServiceTaskContext, Task{ServiceTaskStageResult}}, ProcessStepOptions?)"/>
    /// apply here too.
    /// </param>
    /// <param name="options">
    /// Optional execution options (timeout, retry strategy, wait budget) for the concluding step
    /// alone, winning field-wise over the task's own
    /// <see cref="IProcessStepConfigurable.StepOptions"/>. Declare a polling pipeline's
    /// <see cref="ProcessStepOptions.WaitBudget"/> here rather than on the task: the task's options
    /// are inherited by every stage as well, so a budget declared there is also handed to stages
    /// that never wait, where it reads as though it might apply.
    /// </param>
    /// <exception cref="InvalidOperationException">
    /// A mailbox this pipeline opens is left unanswered. One answered by <see cref="HandleReplies"/> is no
    /// obstacle, but one answered by an earlier <see cref="ConcludeOnReplies"/> is: that answer is the
    /// conclusion of the pipeline <em>that</em> call returned, so the pipeline this call returns opens the
    /// mailbox and answers it nowhere. One <c>Define</c> composes one terminal and returns it.
    /// </exception>
    public ServiceTaskPipeline Finally(
        Func<ServiceTaskContext, Task<ServiceTaskResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();

        RequireEveryMailboxAnswered(nameof(Finally), answeredHere: null);

        return new ServiceTaskPipeline([.. _items], new PipelineConclusion.FinalStep(work, options));
    }

    /// <summary>
    /// Ends the pipeline with the exchange on the mailbox <paramref name="handle"/> names:
    /// <paramref name="onMessage"/> runs once per message, each as its own durable unit of work, until it
    /// concludes the task or the mailbox's timeout runs out.
    /// </summary>
    /// <remarks>
    /// <para>
    /// A handler that has read all it needs concludes with <see cref="ServiceTaskResult.Success"/> or
    /// <see cref="ServiceTaskResult.FailedPermanent"/>; one that expects more answers
    /// <see cref="ServiceTaskExchangeResult.AwaitNextReply"/> and is called again on the next message.
    /// Messages arrive one at a time in accepted order, each starting from the state its predecessor
    /// published.
    /// </para>
    /// <para>
    /// The rest of the vocabulary means what it does anywhere else:
    /// <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/> concludes without advancing the process,
    /// <see cref="ServiceTaskResult.FailedRetryable"/> retries against this same message with nothing yet
    /// closed or started, and <see cref="ServiceTaskResult.Defer"/> parks against it. Concluding closes the
    /// mailbox first, so no later message can land in an exchange already answered.
    /// </para>
    /// <para>
    /// This is the exchange the task <em>ends</em> on; any exchange before it is answered by
    /// <see cref="HandleReplies"/>.
    /// </para>
    /// <para>
    /// Enforcement splits in two: that <paramref name="handle"/> names a mailbox some stage really opened is a
    /// <em>compile-time</em> fact, because a <see cref="MailboxHandle"/> cannot be manufactured; that it is
    /// this pipeline's own handle and is answered only once is checked here and now, so either mistake fails
    /// app <em>startup</em> rather than a callback days later.
    /// </para>
    /// </remarks>
    /// <param name="handle">The mailbox this terminal answers, from the stage that opened it.</param>
    /// <param name="onMessage">Answers one message: conclude the task, or await the next.</param>
    /// <param name="onClosed">
    /// Answers the mailbox closing with the task still unconcluded, in the task's own words. Reached both
    /// when the deadline passed and when the exchange was closed by hand, and it cannot ask for another
    /// message — there is none.
    /// </param>
    /// <param name="options">
    /// Optional execution options for the step each execution of these handlers runs as, as on
    /// <see cref="Finally"/>. Note what a <see cref="ProcessStepOptions.WaitBudget"/> bounds here: the
    /// <em>handler's own</em> deferrals while it works on one message, per execution — not the wait for a
    /// message to arrive, which is <see cref="MailboxOptions.Timeout"/> and spends no budget at all, the
    /// receiver being parked with no timer until the mailbox hands it something.
    /// </param>
    /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
    /// <exception cref="InvalidOperationException">
    /// <paramref name="handle"/> is already answered, or another mailbox this pipeline opens is left
    /// unanswered.
    /// </exception>
    public ServiceTaskPipeline ConcludeOnReplies(
        MailboxHandle handle,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
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
            [.. _items],
            new PipelineConclusion.ReplyExchange(handle.OpeningStageName, onMessage, onClosed, options)
        );
    }

    /// <summary>
    /// The checks both <c>Stage</c> overloads share, run before either constructs its stage: the name is a
    /// usable wire value, unique in this pipeline, and the options are well formed.
    /// </summary>
    private void ValidateStage(string name, ProcessStepOptions? options)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Any(c => c < 0x20 || c > 0x7E))
        {
            throw new ArgumentException(
                $"Stage name '{name}' contains a character outside printable ASCII. Stage names travel in "
                    + "engine step identities that cross HTTP header boundaries, which reject non-ASCII values.",
                nameof(name)
            );
        }
        if (_items.OfType<ServiceTaskStage>().Any(s => string.Equals(s.Name, name, StringComparison.Ordinal)))
        {
            throw new ArgumentException(
                $"Duplicate stage name '{name}'. Names are the stages' identity and must be unique within the pipeline.",
                nameof(name)
            );
        }
        options?.Validate();
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
                $"The mailbox opened by stage '{handle.OpeningStageName}' belongs to another task's pipeline, so "
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
                $"The mailbox opened by stage '{handle.OpeningStageName}' is already answered by an earlier "
                    + $"handler. Each mailbox is answered exactly once — by {nameof(HandleReplies)} or by "
                    + $"{nameof(ConcludeOnReplies)}, never by both and never twice — so a second handler for the "
                    + "same exchange would be dead code."
            );
        }

        mailbox.Answer = answer;
    }

    /// <summary>
    /// The completeness check both terminals run: a terminal <em>is</em> the end of the composition, so a
    /// mailbox still waiting for its handler here is waiting for a call that will never be made. Throws
    /// naming the stage that opened it.
    /// </summary>
    /// <remarks>
    /// A mailbox counts as answered only when the answer travels with the pipeline about to be returned, which
    /// is why <see cref="MailboxAnswer.Terminal"/> satisfies only the terminal that made it — a
    /// <em>second</em> terminal on the same builder hands back a pipeline in which that mailbox is unanswered
    /// again.
    /// </remarks>
    private void RequireEveryMailboxAnswered(string terminal, MailboxHandle? answeredHere)
    {
        IssuedMailbox? unanswered = _mailboxes.FirstOrDefault(m =>
            m.Answer is not MailboxAnswer.Segment && !ReferenceEquals(m.Handle, answeredHere)
        );
        if (unanswered is null)
        {
            return;
        }

        string stage = unanswered.Handle.OpeningStageName;
        throw new InvalidOperationException(
            unanswered.Answer is MailboxAnswer.Terminal
                ? $"The mailbox opened by stage '{stage}' is answered by an earlier {nameof(ConcludeOnReplies)}, but "
                    + $"that answer is the conclusion of the pipeline that call returned — and this {terminal} "
                    + "returns a different pipeline, in which nothing answers it. A Define composes one terminal "
                    + "and returns it; two terminals on one builder are two pipelines, and the one left behind "
                    + "takes its exchange's answer with it."
                : $"Stage '{stage}' opens a mailbox that nothing answers, and this pipeline ends here with "
                    + $"{terminal}: the messages that come back would have no handler, and nothing in this pipeline "
                    + $"would ever read them. Answer it before the pipeline ends — with {nameof(HandleReplies)} to "
                    + $"carry on afterwards, or with {nameof(ConcludeOnReplies)} to end there — passing the handle "
                    + "the stage handed out."
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
        /// A <see cref="HandleReplies"/> handler answers it, and that handler is one of the pipeline's items —
        /// so the answer travels with every pipeline this builder can still return.
        /// </summary>
        Segment,

        /// <summary>
        /// A terminal answers it, and that answer is the conclusion of the one pipeline that terminal returned
        /// — so it says nothing about a pipeline any later terminal call would hand back.
        /// </summary>
        Terminal,
    }
}
