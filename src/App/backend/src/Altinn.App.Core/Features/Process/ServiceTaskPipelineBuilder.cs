using System.Diagnostics;

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
        AddStage(name, (context, _) => work(context), options, opensMailbox: null);
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
    /// The declaration and the mailbox-aware delegate travel together because the address exists for the
    /// sake of the message this stage sends: the stage that sends is the stage that publishes the address,
    /// and the mailbox's deadline starts when this stage's mint runs. In this version a pipeline opens at
    /// most one mailbox, and the terminal answering <paramref name="handle"/> concludes the task.
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

        AddStage(
            name,
            // Non-null for a declaring stage by construction: the runtime reads the stage's own declaration to
            // decide what to hand it, and fails the step before the work runs if the mint's record is missing.
            (context, minted) =>
                work(
                    context,
                    minted
                        ?? throw new UnreachableException(
                            $"Stage '{name}' opens a mailbox but was handed none to publish."
                        )
                ),
            options,
            opensMailbox: mailbox
        );

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
    /// Exactly one of the two runs, and whichever it is concludes the task — there is no way to ask for
    /// another message, which is the difference from <see cref="ConcludeOnReplies"/>. Both handlers follow
    /// the rules a <see cref="Finally"/> does: idempotent, data changes saved when they answer.
    /// </remarks>
    /// <param name="handle">The mailbox this terminal answers, from the stage that opened it.</param>
    /// <param name="onMessage">Answers the one message, concluding the task.</param>
    /// <param name="onClosed">
    /// Answers the mailbox closing unanswered, concluding the task in the task's own words. The
    /// <see cref="MailboxClosedReason"/> changes only the wording — both reasons mean no message can arrive.
    /// </param>
    /// <param name="options">Optional execution options for the concluding step, as on <see cref="Finally"/>.</param>
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
    /// A handler that has read all it needs concludes with <see cref="ServiceTaskResult.Success"/> or
    /// <see cref="ServiceTaskResult.FailedPermanent"/>; one that expects more answers
    /// <see cref="ServiceTaskExchangeResult.AwaitNextReply"/> and is called again on the next message.
    /// Messages arrive one at a time in accepted order, each starting from the state its predecessor
    /// published.
    /// </remarks>
    /// <param name="handle">The mailbox this terminal answers, from the stage that opened it.</param>
    /// <param name="onMessage">Answers one message: conclude the task, or await the next.</param>
    /// <param name="onClosed">
    /// Answers the mailbox closing with the task still unconcluded, in the task's own words. Reached both
    /// when the deadline passed and when the exchange was closed by hand, and it cannot ask for another
    /// message — there is none.
    /// </param>
    /// <param name="options">Optional execution options for the concluding step, as on <see cref="Finally"/>.</param>
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

    private void AddStage(
        string name,
        Func<ServiceTaskContext, ServiceTaskMailbox?, Task<ServiceTaskStageResult>> work,
        ProcessStepOptions? options,
        MailboxOptions? opensMailbox
    )
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

        _stages.Add(new ServiceTaskStage(name, work, options, opensMailbox));
    }
}
