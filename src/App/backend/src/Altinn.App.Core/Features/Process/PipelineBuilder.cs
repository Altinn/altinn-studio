namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a pipeline of durable stages: <see cref="Lifecycle"/> for the work a task does when it starts, ends or is
/// abandoned, and <see cref="ServiceTask"/> for a service task. Composition mistakes throw from the composing call and
/// fail app startup. Authoring guidance: <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </summary>
public abstract class PipelineBuilder
{
    // The private constructor closes the family to the variants nested here. The base declares no Stage on purpose:
    // C# skips a base class's overloads whenever one on the subclass fits, so a Stage here would let a placeholder
    // such as `c => throw new NotImplementedException()` compile as a service task's ending stage instead of failing
    // as ambiguous.
    private PipelineBuilder() { }

    /// <summary>
    /// A stage that carries on, as both variants compose it.
    /// </summary>
    private static PipelineStage.Plain PlainStage(
        Func<StageContext, Task<StageResult>> work,
        ProcessStepOptions? options
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();
        return new PipelineStage.Plain(work, options) { DisplayName = PipelineStepNames.FromMethod(work) };
    }

    /// <summary>
    /// Composes the work a task does when it starts, ends or is abandoned, in
    /// <see cref="Internal.Process.ProcessTasks.IProcessTask.DefineStart"/>, <c>DefineEnd</c> or <c>DefineAbandon</c>.
    /// These stages run inside the transition and never advance the process, so there is nothing to end and no
    /// mailbox to open.
    /// </summary>
    public sealed class Lifecycle : PipelineBuilder
    {
        private readonly List<PipelineStage.Plain> _stages = [];

        /// <summary>
        /// Not constructible by apps: the runtime hands each <c>Define</c> method a fresh builder and reads what it
        /// composed.
        /// </summary>
        internal Lifecycle() { }

        /// <summary>
        /// Adds a durable stage, run in composition order. A completed stage never runs again; a retry or resume
        /// re-enters at the failed stage.
        /// </summary>
        /// <param name="work">
        /// The stage's work. <strong>MUST be idempotent — it may be retried on failure</strong>; use
        /// <see cref="StageContext.StepId"/> as the idempotency key for calls the stage must not repeat.
        /// </param>
        /// <param name="options">
        /// Optional execution options for the step this stage runs as: its timeout, retry strategy and wait budget.
        /// A field left unset falls back to the command's default and then the engine's.
        /// </param>
        public Lifecycle Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null)
        {
            _stages.Add(PlainStage(work, options));
            return this;
        }

        /// <summary>
        /// The stages composed so far, in composition order.
        /// </summary>
        internal ProcessTaskPipeline ToPipeline() => new(_stages);
    }

    /// <summary>
    /// Composes a service task's pipeline in <see cref="IServiceTask.DefineExecute"/>. What a step's work returns
    /// decides whether it carries on (<see cref="StageResult"/>) or ends the task (<see cref="ServiceTaskResult"/>).
    /// The step that ends the task returns the <see cref="ServiceTaskPipeline"/> that <c>DefineExecute</c> returns, so
    /// it comes last. A task that does one thing is that one step: <c>pipeline.Stage(Execute)</c>.
    /// </summary>
    public sealed class ServiceTask : PipelineBuilder
    {
        private const string EndingStage = "a Stage whose work returns ServiceTaskResult";
        private const string EndingReplies = "a HandleReplies whose handlers end the task";

        private readonly List<PipelineItem> _items = [];

        /// <summary>
        /// The mailboxes this builder has issued handles for, each marked once a handler answers it. A fresh builder
        /// per <c>DefineExecute</c> call, so this is one pipeline's whole set.
        /// </summary>
        private readonly List<IssuedMailbox> _mailboxes = [];

        /// <summary>
        /// The step that ended this builder, or null while it is still composing.
        /// </summary>
        private string? _endedBy;

        /// <summary>
        /// Not constructible by apps: a <c>DefineExecute</c> spreading its composition over two builders could lose a
        /// mailbox declaration made on the one it did not return from.
        /// </summary>
        internal ServiceTask() { }

        /// <summary>
        /// Adds a durable stage that carries on, run in composition order before the step that ends the task. A
        /// completed stage never runs again; a retry or resume re-enters the pipeline at the failed stage.
        /// </summary>
        /// <param name="work">
        /// The stage's work. <strong>MUST be idempotent — it may be retried on failure</strong>; use
        /// <see cref="StageContext.StepId"/> as the idempotency key for calls the stage must not repeat.
        /// </param>
        /// <param name="options">
        /// Optional execution options for the step this stage runs as: its timeout, retry strategy and wait budget.
        /// A field left unset falls back to the command's default and then the engine's.
        /// </param>
        /// <exception cref="InvalidOperationException">The builder has already ended.</exception>
        public ServiceTask Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null)
        {
            ThrowIfEnded(nameof(Stage));
            _items.Add(PlainStage(work, options));
            return this;
        }

        /// <summary>
        /// Ends the pipeline with the step that decides how the task ends, run once everything composed before it has
        /// finished. For a polling pipeline this is where the wait lives: return <see cref="ServiceTaskResult.Defer"/>
        /// until the outcome arrives.
        /// </summary>
        /// <param name="work">
        /// The concluding work. The idempotency rules of a stage that carries on apply here too.
        /// </param>
        /// <param name="options">
        /// Optional execution options for this step alone. A polling pipeline declares its
        /// <see cref="ProcessStepOptions.WaitBudget"/> here, on the step that waits.
        /// </param>
        /// <exception cref="InvalidOperationException">
        /// A mailbox this pipeline opens is left unanswered, or the builder has already ended.
        /// </exception>
        public ServiceTaskPipeline Stage(
            Func<StageContext, Task<ServiceTaskResult>> work,
            ProcessStepOptions? options = null
        )
        {
            ThrowIfEnded(nameof(Stage));
            ArgumentNullException.ThrowIfNull(work);
            options?.Validate();
            End(EndingStage);

            RequireEveryMailboxAnswered(EndingStage);

            return new ServiceTaskPipeline(
                _items,
                new PipelineConclusion.Final(work, options) { DisplayName = PipelineStepNames.FromMethod(work) }
            );
        }

        /// <summary>
        /// Adds a durable stage that <strong>opens a mailbox</strong>: a durable inbox whose id the stage publishes as
        /// its reply address. Every message that comes back runs the <c>HandleReplies</c> that answers
        /// <paramref name="handle"/>. Otherwise a stage that carries on, except that its vocabulary,
        /// <see cref="ServiceTaskOpeningStageResult"/>, adds <see cref="ServiceTaskOpeningStageResult.Conclude"/> for
        /// the send whose failure already settles the task (see that member's remarks).
        /// </summary>
        /// <param name="work">The stage's work, handed the mailbox it opened.</param>
        /// <param name="mailbox">How long the mailbox accepts messages.</param>
        /// <param name="handle">
        /// The opened mailbox, to be passed to exactly one <c>HandleReplies</c>.
        /// </param>
        /// <param name="options">Optional per-stage execution options, as above.</param>
        /// <exception cref="InvalidOperationException">The builder has already ended.</exception>
        public ServiceTask Stage(
            Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> work,
            MailboxOptions mailbox,
            out MailboxHandle handle,
            ProcessStepOptions? options = null
        )
        {
            ThrowIfEnded(nameof(Stage));
            ArgumentNullException.ThrowIfNull(work);
            ArgumentNullException.ThrowIfNull(mailbox);
            mailbox.Validate();
            options?.Validate();
            int openingIndex = _items.Count;
            _items.Add(
                new PipelineStage.MailboxOpening(work, mailbox, options)
                {
                    DisplayName = PipelineStepNames.FromMethod(work),
                }
            );

            handle = new MailboxHandle(this, openingIndex);
            _mailboxes.Add(new IssuedMailbox(handle));
            return this;
        }

        /// <summary>
        /// Answers the exchange on the mailbox <paramref name="handle"/> names and <strong>carries on</strong>:
        /// <paramref name="onMessage"/> runs once per message until it says the exchange is over, and then the
        /// pipeline carries on with whatever is composed after this call.
        /// </summary>
        /// <param name="handle">The mailbox this handler answers, from the stage that opened it.</param>
        /// <param name="onMessage">
        /// Answers one message: <see cref="StageExchangeResult.AwaitNextReply"/> to be called again on the next one,
        /// <see cref="StageResult.Completed"/> to end the exchange and let the pipeline continue.
        /// </param>
        /// <param name="onClosed">
        /// Answers the mailbox closing with the exchange unfinished — fatal (<see cref="StageResult.FailedPermanent"/>),
        /// or simply the end of an exchange the task can live without (<see cref="StageResult.Completed"/>).
        /// </param>
        /// <param name="options">
        /// Optional execution options for the step each execution of these handlers runs as. A
        /// <see cref="ProcessStepOptions.WaitBudget"/> here bounds the handler's own deferrals per message — not the
        /// wait for a message, which is <see cref="MailboxOptions.Timeout"/>.
        /// </param>
        /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
        /// <exception cref="InvalidOperationException">
        /// <paramref name="handle"/> is already answered, or the builder has already ended.
        /// </exception>
        public ServiceTask HandleReplies(
            MailboxHandle handle,
            Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage,
            Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed,
            ProcessStepOptions? options = null
        )
        {
            ThrowIfEnded(nameof(HandleReplies));
            ArgumentNullException.ThrowIfNull(handle);
            ArgumentNullException.ThrowIfNull(onMessage);
            ArgumentNullException.ThrowIfNull(onClosed);
            options?.Validate();

            ClaimMailbox(handle);
            _items.Add(
                new ReplySegment(handle.OpeningIndex, onMessage, onClosed, options)
                {
                    DisplayName = PipelineStepNames.FromMethods(onMessage, onClosed),
                }
            );
            return this;
        }

        /// <summary>
        /// Answers the exchange on the mailbox <paramref name="handle"/> names and <strong>ends the task</strong>
        /// there: <paramref name="onMessage"/> runs once per message until it concludes the task or the mailbox's
        /// timeout runs out. Concluding closes the mailbox first, so no later message can land in an exchange already
        /// answered.
        /// </summary>
        /// <param name="handle">The mailbox this handler answers, from the stage that opened it.</param>
        /// <param name="onMessage">Answers one message: conclude the task, or await the next.</param>
        /// <param name="onClosed">
        /// Answers the mailbox closing with the task still unconcluded. It cannot ask for another message.
        /// </param>
        /// <param name="options">
        /// Optional execution options for the step each execution of these handlers runs as. A
        /// <see cref="ProcessStepOptions.WaitBudget"/> here bounds the handler's own deferrals per message — not the
        /// wait for a message, which is <see cref="MailboxOptions.Timeout"/>.
        /// </param>
        /// <exception cref="ArgumentException"><paramref name="handle"/> belongs to another pipeline.</exception>
        /// <exception cref="InvalidOperationException">
        /// <paramref name="handle"/> is already answered, another mailbox this pipeline opens is left unanswered, or
        /// the builder has already ended.
        /// </exception>
        public ServiceTaskPipeline HandleReplies(
            MailboxHandle handle,
            Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
            Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
            ProcessStepOptions? options = null
        )
        {
            ThrowIfEnded(nameof(HandleReplies));
            ArgumentNullException.ThrowIfNull(handle);
            ArgumentNullException.ThrowIfNull(onMessage);
            ArgumentNullException.ThrowIfNull(onClosed);
            options?.Validate();
            End(EndingReplies);

            ClaimMailbox(handle);
            RequireEveryMailboxAnswered(EndingReplies);

            return new ServiceTaskPipeline(
                _items,
                new PipelineConclusion.ReplyExchange(handle.OpeningIndex, onMessage, onClosed, options)
                {
                    DisplayName = PipelineStepNames.FromMethods(onMessage, onClosed),
                }
            );
        }

        /// <summary>
        /// Ends the builder at the step being called, once its arguments are valid and before it changes anything,
        /// so a step that throws after that leaves nothing half-composed for a later call to finish. Every step
        /// checks <see cref="ThrowIfEnded"/> before its arguments, so a second ending reports the ending first.
        /// </summary>
        private void End(string ending) => _endedBy = ending;

        /// <summary>
        /// Refuses a call on a builder whose pipeline has already ended. A second chain built on the same builder
        /// would otherwise also take every stage composed for the first, and a stage added after the ending would
        /// never run.
        /// </summary>
        private void ThrowIfEnded(string call)
        {
            if (_endedBy is null)
            {
                return;
            }

            throw new InvalidOperationException(
                $"The pipeline was already ended by {_endedBy}, so {call} cannot add to it. A builder composes one "
                    + "pipeline and ends it once: a second ending would also take every stage composed before the "
                    + "first, and a stage added after the ending would never run. Compose each alternative as a "
                    + "complete chain in its own branch, so that only the chain you return is built."
            );
        }

        /// <summary>
        /// Claims the mailbox <paramref name="handle"/> names for the handler being composed: the two things the
        /// type system cannot say — that the handle came from this builder, and that nothing answers it yet.
        /// </summary>
        private void ClaimMailbox(MailboxHandle handle)
        {
            if (!ReferenceEquals(handle.Owner, this))
            {
                throw new ArgumentException(
                    $"The mailbox opened at index {handle.OpeningIndex} belongs to another task's pipeline, so "
                        + "this one cannot answer it. Pass the handle handed out by this pipeline's own "
                        + "mailbox-opening stage.",
                    nameof(handle)
                );
            }

            // Owned by this builder, so this builder issued it, so it is registered.
            IssuedMailbox mailbox = _mailboxes.Single(m => ReferenceEquals(m.Handle, handle));
            if (mailbox.IsAnswered)
            {
                throw new InvalidOperationException(
                    $"The mailbox opened at index {handle.OpeningIndex} is already answered by an earlier "
                        + $"{nameof(HandleReplies)}. Each mailbox is answered by exactly one {nameof(HandleReplies)}, "
                        + "so a second handler for the same exchange would be dead code."
                );
            }

            mailbox.IsAnswered = true;
        }

        /// <summary>
        /// The completeness check both endings run: the step that ends the task is the end of the composition, so a
        /// mailbox still waiting for its handler here is waiting for a call that will never be made.
        /// </summary>
        private void RequireEveryMailboxAnswered(string ending)
        {
            IssuedMailbox? unanswered = _mailboxes.FirstOrDefault(m => !m.IsAnswered);
            if (unanswered is null)
            {
                return;
            }

            throw new InvalidOperationException(
                $"A mailbox is opened at index {unanswered.Handle.OpeningIndex}, but nothing answers it, and this "
                    + $"pipeline ends here with {ending}: the messages that come back would have no handler, and "
                    + $"nothing in this pipeline would ever read them. Answer it with {nameof(HandleReplies)} before "
                    + "the pipeline ends, passing the handle the stage handed out: with handlers that carry on, to "
                    + "continue afterwards, or with handlers that end the task, to end there."
            );
        }

        /// <summary>
        /// One mailbox this builder issued a handle for, and whether a handler answers it.
        /// </summary>
        private sealed class IssuedMailbox(MailboxHandle handle)
        {
            internal MailboxHandle Handle { get; } = handle;

            internal bool IsAnswered { get; set; }
        }
    }
}
