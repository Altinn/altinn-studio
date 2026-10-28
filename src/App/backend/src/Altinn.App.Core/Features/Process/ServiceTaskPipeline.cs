namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable items, ending with the one conclusion. Built via
/// <see cref="PipelineBuilder"/> and returned from <see cref="IServiceTask.DefineExecute"/>; the
/// runtime reads it to expand, dispatch and validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    internal ServiceTaskPipeline(IReadOnlyList<PipelineItem> items, PipelineConclusion conclusion)
    {
        Items = [.. items, conclusion];
    }

    /// <summary>
    /// Everything the pipeline composes, in composition order and ending with its conclusion — one list, read
    /// by shape. A position in this list is an item's index: the one identity every step of the pipeline is
    /// dispatched by, the concluding step included.
    /// </summary>
    internal IReadOnlyList<PipelineItem> Items { get; }
}

/// <summary>
/// One entry in <see cref="ServiceTaskPipeline.Items"/>: a stage, a reply handler the pipeline carries on
/// past, or the conclusion the list ends with. Not a record — items hold delegates, so synthesized value
/// equality would compare references while claiming to compare values.
/// </summary>
internal abstract class PipelineItem
{
    private protected PipelineItem(ProcessStepOptions? stepOptions)
    {
        StepOptions = stepOptions;
    }

    /// <summary>
    /// Options for the engine step this item becomes and for nothing else. A field left unset falls back to the
    /// command's default and then the engine's.
    /// </summary>
    internal ProcessStepOptions? StepOptions { get; }
}

/// <summary>
/// What a <strong>reply handler</strong> is, whichever of the two kinds it is: an item that answers the
/// exchange the stage at <see cref="OpeningIndex"/> opened, and that is therefore alone in its workflow.
/// Implemented by exactly <see cref="ReplySegment"/> and <see cref="PipelineConclusion.ReplyExchange"/>, and
/// it exists so that "this item is a reply handler" has one definition: the expansion splits runs on it, a
/// stage's completion reads it to know whether it is its workflow's last step, and dispatch refuses a handler
/// handed no message by it. Three type tests spelled out separately would be three places to forget a third
/// kind of handler.
/// </summary>
/// <remarks>
/// An interface and not a base class because a base class is not available:
/// <see cref="PipelineConclusion.ReplyExchange"/> is rooted in <see cref="PipelineConclusion"/>, and
/// <see cref="ServiceTaskPipeline"/>'s only constructor taking
/// a <see cref="PipelineConclusion"/> and appending it last is what makes "exactly one conclusion, and it is
/// last" structural — a shared base for both kinds would have to re-root one of them and would take that with
/// it.
/// <para>
/// <strong>What keeps the two vocabularies apart is what this interface leaves out:</strong> it exposes
/// <see cref="OpeningIndex"/> and nothing else. Neither <c>OnMessage</c> nor <c>OnClosed</c> is here, because
/// their return types <em>are</em> the two verdict vocabularies — an exchange's, which can conclude the task
/// and advance the process, and a stage's, which cannot. Nothing holding an <see cref="IReplyHandlerItem"/>
/// can therefore run a handler at all, let alone run one as though it were the other, and dispatch still has
/// to name the kind it is running. Adding a handler delegate here is what would break that, so do not.
/// </para>
/// </remarks>
internal interface IReplyHandlerItem
{
    /// <summary>
    /// The item that opened the mailbox this handler answers — the exchange's identity in the carry and in
    /// the mint step's engine identity.
    /// </summary>
    int OpeningIndex { get; }
}

/// <summary>
/// One composed stage — a closed set of exactly two shapes, so each shape's work delegate takes the arguments
/// it actually needs and no execution reads a nullable declaration to rediscover which kind of stage it is
/// running.
/// </summary>
internal abstract class PipelineStage : PipelineItem
{
    private PipelineStage(ProcessStepOptions? stepOptions)
        : base(stepOptions) { }

    /// <summary>A stage with no part in any exchange: work in, stage result out.</summary>
    internal sealed class Plain : PipelineStage
    {
        public Plain(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? stepOptions)
            : base(stepOptions)
        {
            Work = work;
        }

        /// <summary>The stage's work, exactly as the app supplied it.</summary>
        public Func<StageContext, Task<StageResult>> Work { get; }
    }

    /// <summary>
    /// The stage that opens the exchange's mailbox and sends its address. Its work is handed the mailbox as a
    /// non-nullable argument, and answers the widened <see cref="ServiceTaskOpeningStageResult"/> vocabulary.
    /// </summary>
    internal sealed class MailboxOpening : PipelineStage
    {
        public MailboxOpening(
            Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> work,
            MailboxOptions declaration,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            Work = work;
            Declaration = declaration;
        }

        /// <summary>The stage's work, handed the mailbox it opened.</summary>
        public Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> Work { get; }

        /// <summary>
        /// The mailbox declaration. The mint step reads its <see cref="MailboxOptions.Timeout"/>
        /// immediately before this stage runs.
        /// </summary>
        public MailboxOptions Declaration { get; }
    }
}

/// <summary>
/// A reply handler that answers an exchange <strong>without concluding the task</strong>: everything composed
/// after it runs once its exchange is over. Deliberately the same shape as
/// <see cref="PipelineConclusion.ReplyExchange"/> and not the same type: which of the two the handler is —
/// not where it sits — tells the runtime whether answering the exchange ends the task or starts the
/// pipeline's next leg.
/// </summary>
internal sealed class ReplySegment : PipelineItem, IReplyHandlerItem
{
    internal ReplySegment(
        int openingIndex,
        Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage,
        Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed,
        ProcessStepOptions? stepOptions
    )
        : base(stepOptions)
    {
        OpeningIndex = openingIndex;
        OnMessage = onMessage;
        OnClosed = onClosed;
    }

    /// <inheritdoc />
    public int OpeningIndex { get; }

    /// <summary>Answers one delivered message, with no way to conclude the task.</summary>
    internal Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> OnMessage { get; }

    /// <summary>Answers the mailbox closing with no message left to handle.</summary>
    internal Func<StageContext, MailboxClosedReason, Task<StageResult>> OnClosed { get; }
}

/// <summary>
/// How a pipeline concludes — a closed set of exactly two shapes, so no execution has to interrogate nullable
/// fields to discover whether a conclusion is secretly also a reply handler. A conclusion's
/// <see cref="PipelineItem.StepOptions"/> are null when the task gave its conclusion none, so it takes the
/// command's and the engine's defaults.
/// </summary>
internal abstract class PipelineConclusion : PipelineItem
{
    private PipelineConclusion(ProcessStepOptions? stepOptions)
        : base(stepOptions) { }

    /// <summary>
    /// The pipeline ends with one more step — for a task that does one thing, its whole work.
    /// </summary>
    internal sealed class FinalStep : PipelineConclusion
    {
        public FinalStep(Func<StageContext, Task<ServiceTaskResult>> work, ProcessStepOptions? stepOptions)
            : base(stepOptions)
        {
            Work = work;
        }

        /// <summary>The concluding work.</summary>
        public Func<StageContext, Task<ServiceTaskResult>> Work { get; }
    }

    /// <summary>
    /// The pipeline ends with the mailbox exchange a stage opened: <see cref="OnMessage"/> runs once per
    /// delivered message, <see cref="OnClosed"/> once if the mailbox closes with the task still unconcluded.
    /// One shape however many messages an exchange carries.
    /// </summary>
    internal sealed class ReplyExchange : PipelineConclusion, IReplyHandlerItem
    {
        public ReplyExchange(
            int openingIndex,
            Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
            Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            OpeningIndex = openingIndex;
            OnMessage = onMessage;
            OnClosed = onClosed;
        }

        /// <inheritdoc />
        public int OpeningIndex { get; }

        /// <summary>Answers one delivered message.</summary>
        public Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> OnMessage { get; }

        /// <summary>Answers the mailbox closing with no message left to handle.</summary>
        public Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> OnClosed { get; }
    }
}
