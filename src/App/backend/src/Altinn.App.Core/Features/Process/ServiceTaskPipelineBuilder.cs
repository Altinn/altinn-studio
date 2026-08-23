namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a service task's pipeline inside <see cref="IPipelineServiceTask.Define"/>: zero or
/// more <see cref="Stage(string, Func{ServiceTaskContext, Task{ServiceTaskStageResult}}, ProcessStepOptions?)"/>
/// calls, ended by exactly one terminal — <see cref="Finally"/>, <see cref="ConcludeOnReply"/> or
/// <see cref="ConcludeOnReplies"/>. The types enforce the shape: a terminal is the only way to obtain the
/// <see cref="ServiceTaskPipeline"/> that <c>Define</c> must return.
/// </summary>
/// <remarks>
/// The builder validates eagerly: an empty or duplicate stage name, a null work delegate, invalid
/// <see cref="ProcessStepOptions"/>, a second mailbox, a mailbox handle from another pipeline, a handle
/// answered twice, and a mailbox opened but never answered all throw from the composing call itself, which
/// surfaces as an app startup failure when the pipeline is validated.
/// </remarks>
public sealed class ServiceTaskPipelineBuilder
{
    private readonly List<ServiceTaskStage> _stages = [];

    /// <summary>The one handle this builder has issued, if any. A fresh builder per <c>Define</c> call.</summary>
    private MailboxHandle? _handle;

    /// <summary>
    /// Whether a reply terminal has answered <see cref="_handle"/>. A handle is answered exactly once: a
    /// second terminal would be dead code, and <see cref="Finally"/> refuses outright once a stage has opened
    /// a mailbox, answered or not — a pipeline with a mailbox-opening stage has no valid final step.
    /// </summary>
    private bool _handleAnswered;

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
        _stages.Add(new ServiceTaskStage.Plain(name, work, options));
        return this;
    }

    /// <summary>
    /// Adds a durable stage that <strong>opens a mailbox</strong>: a durable inbox whose id the stage
    /// publishes as its reply address, handed to <paramref name="work"/> as a
    /// <see cref="ServiceTaskMailbox"/>. Every message that comes back runs the reply terminal that answers
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
    /// <strong>A task gets one exchange in this version:</strong> a second mailbox-opening stage throws here,
    /// and two exchanges are, for now, two BPMN tasks. The terminal answering <paramref name="handle"/>
    /// concludes the task, so such a pipeline has no <see cref="Finally"/>.
    /// </para>
    /// </remarks>
    /// <param name="name">The stage's wire identity, as above — and the exchange's identity too.</param>
    /// <param name="work">The stage's work, handed the mailbox it opened.</param>
    /// <param name="mailbox">How long the mailbox accepts messages.</param>
    /// <param name="handle">
    /// The opened mailbox, to be passed to <see cref="ConcludeOnReply"/> or
    /// <see cref="ConcludeOnReplies"/> — exactly one of them, exactly once.
    /// </param>
    /// <param name="options">Optional per-stage execution options, as above.</param>
    /// <exception cref="InvalidOperationException">This pipeline already opens a mailbox.</exception>
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

        if (_handle is { } existing)
        {
            throw new InvalidOperationException(
                $"This pipeline already opens a mailbox from stage '{existing.OpeningStageName}'. A task opens at "
                    + "most one mailbox — one exchange, one address, one conclusion. Two exchanges are two BPMN "
                    + "tasks for now."
            );
        }

        ValidateStage(name, options);
        _stages.Add(new ServiceTaskStage.MailboxOpening(name, work, mailbox, options));

        handle = _handle = new MailboxHandle(this, name);
        return this;
    }

    /// <summary>
    /// Ends the pipeline with its conclusion — the one step that decides how the task concludes
    /// (success, auto-advance action, park, defer, failure), executed after every stage has
    /// completed. For a polling pipeline this is where the wait lives: return
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
    /// A stage of this pipeline opens a mailbox. Only a reply terminal can end such a pipeline — a final step
    /// would conclude the task before the first message arrived.
    /// </exception>
    public ServiceTaskPipeline Finally(
        Func<ServiceTaskContext, Task<ServiceTaskResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();

        if (_handle is { } unanswered)
        {
            throw new InvalidOperationException(
                $"Stage '{unanswered.OpeningStageName}' opens a mailbox, but this pipeline ends with "
                    + $"{nameof(Finally)}, so nothing answers it: the messages that come back would have no "
                    + $"handler, and the task would conclude before any of them arrived. End with "
                    + $"{nameof(ConcludeOnReply)} or {nameof(ConcludeOnReplies)}, passing the handle the stage "
                    + "handed out."
            );
        }

        return new ServiceTaskPipeline([.. _stages], new PipelineConclusion.FinalStep(work, options));
    }

    /// <summary>
    /// Ends the pipeline with a <strong>one-message</strong> exchange on the mailbox
    /// <paramref name="handle"/> names: <paramref name="onMessage"/> runs on the first message that arrives
    /// and concludes the task, and <paramref name="onClosed"/> runs instead if the mailbox closes first.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Exactly one of the two runs, and whichever it is concludes the task — there is no way to ask for
    /// another message, which is the difference from <see cref="ConcludeOnReplies"/>. Both handlers follow
    /// the rules a <see cref="Finally"/> does: idempotent, data changes saved when they answer.
    /// </para>
    /// <para>
    /// Both return <see cref="ServiceTaskResult"/>, so they answer what any concluding step answers:
    /// <see cref="ServiceTaskResult.Success"/> (which also closes the mailbox, before anything downstream
    /// starts), <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/>,
    /// <see cref="ServiceTaskResult.FailedPermanent"/>, <see cref="ServiceTaskResult.FailedRetryable"/> to
    /// retry against this same message, or <see cref="ServiceTaskResult.Defer"/> to park against it.
    /// <see cref="ServiceTaskExchangeResult.AwaitNextReply"/> does not compile from either handler — which is
    /// what makes this terminal a one-message exchange rather than a convention.
    /// </para>
    /// <para>
    /// <strong>A task gets one exchange in this version.</strong> The mailbox this terminal answers is the only
    /// one its pipeline may open, and two exchanges are, for now, two BPMN tasks.
    /// </para>
    /// <para>
    /// Enforcement splits in two: that <paramref name="handle"/> names a mailbox some stage really opened is a
    /// <em>compile-time</em> fact, because a <see cref="MailboxHandle"/> cannot be manufactured; that it is
    /// this pipeline's own handle and is answered only once is checked here and now, so either mistake fails
    /// app <em>startup</em> rather than a callback days later.
    /// </para>
    /// </remarks>
    /// <param name="handle">The mailbox this terminal answers, from the stage that opened it.</param>
    /// <param name="onMessage">Answers the one message, concluding the task.</param>
    /// <param name="onClosed">
    /// Answers the mailbox closing unanswered, concluding the task in the task's own words. The
    /// <see cref="MailboxClosedReason"/> changes only the wording — both reasons mean no message can arrive.
    /// </param>
    /// <param name="options">
    /// Optional execution options for the step each execution of these handlers runs as, as on
    /// <see cref="Finally"/>. Note what a <see cref="ProcessStepOptions.WaitBudget"/> bounds here: the
    /// <em>handler's own</em> deferrals while it works on one message, per execution — not the wait for a
    /// message to arrive, which is <see cref="MailboxOptions.Timeout"/> and spends no budget at all, the
    /// receiver being parked with no timer until the mailbox hands it something.
    /// </param>
    /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
    /// <exception cref="InvalidOperationException"><paramref name="handle"/> is already answered.</exception>
    public ServiceTaskPipeline ConcludeOnReply(
        MailboxHandle handle,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(onMessage);

        // Widening only: a conclusion is an exchange result, so nothing is lost — and nothing is gained
        // either, which is the point. AwaitNextReply does not compile in the caller's delegate.
        return Conclude(handle, async (context, reply) => await onMessage(context, reply), onClosed, options);
    }

    /// <summary>
    /// Ends the pipeline with a <strong>multi-message</strong> exchange on the mailbox
    /// <paramref name="handle"/> names: <paramref name="onMessage"/> runs once per message, each as its own
    /// durable unit of work, until it concludes the task or the mailbox's timeout runs out.
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
    /// <strong>A task gets one exchange in this version.</strong> Many messages, yes — but the mailbox this
    /// terminal answers is the only one its pipeline may open, and two exchanges are, for now, two BPMN tasks.
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
    /// <exception cref="InvalidOperationException"><paramref name="handle"/> is already answered.</exception>
    public ServiceTaskPipeline ConcludeOnReplies(
        MailboxHandle handle,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(onMessage);
        return Conclude(handle, onMessage, onClosed, options);
    }

    private ServiceTaskPipeline Conclude(
        MailboxHandle handle,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
        ProcessStepOptions? options
    )
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(onClosed);
        options?.Validate();

        if (!ReferenceEquals(handle.Owner, this))
        {
            throw new ArgumentException(
                $"The mailbox opened by stage '{handle.OpeningStageName}' belongs to another task's pipeline, so "
                    + "this one cannot answer it. Pass the handle handed out by this pipeline's own mailbox-opening "
                    + "stage.",
                nameof(handle)
            );
        }

        if (_handleAnswered)
        {
            throw new InvalidOperationException(
                $"The mailbox opened by stage '{handle.OpeningStageName}' is already answered by a reply terminal. "
                    + "One exchange has one conclusion; a second terminal would be dead code."
            );
        }

        _handleAnswered = true;
        return new ServiceTaskPipeline(
            [.. _stages],
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
        if (_stages.Any(s => string.Equals(s.Name, name, StringComparison.Ordinal)))
        {
            throw new ArgumentException(
                $"Duplicate stage name '{name}'. Names are the stages' identity and must be unique within the pipeline.",
                nameof(name)
            );
        }
        options?.Validate();
    }
}
