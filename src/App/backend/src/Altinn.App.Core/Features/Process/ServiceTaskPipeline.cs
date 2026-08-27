namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable items, ending with the one conclusion — a
/// concluding step, or the handlers that answer the mailbox a stage opened. Built via
/// <see cref="ServiceTaskPipelineBuilder"/> and returned from
/// <see cref="IPipelineServiceTask.Define"/>; the runtime reads it to expand, dispatch and
/// validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    /// <summary>
    /// Takes the conclusion apart from the rest and appends it, so "exactly one conclusion, and it is
    /// last" is a property of the only constructor rather than of a validation something could skip. The
    /// items are copied, so a builder still composing cannot mutate a pipeline it already handed back.
    /// </summary>
    internal ServiceTaskPipeline(IReadOnlyList<PipelineItem> items, PipelineConclusion conclusion)
    {
        Items = [.. items, conclusion];
    }

    /// <summary>
    /// Everything the pipeline composes, in composition order and ending with its conclusion — one list,
    /// read by shape. Never empty: the last entry is always the <see cref="PipelineConclusion"/>, and a
    /// simple service task's pipeline is that entry alone. A position in this list is an item's index —
    /// the one identity every step of the pipeline is dispatched by, the concluding step included.
    /// </summary>
    internal IReadOnlyList<PipelineItem> Items { get; }
}

/// <summary>
/// One entry in <see cref="ServiceTaskPipeline.Items"/>: something the pipeline does, in composition
/// order — a stage, a reply handler it carries on past, or the conclusion the list ends with.
/// </summary>
/// <remarks>
/// Not a record, for the reason <see cref="ServiceTaskStage"/> gives: an item holds delegates, so
/// synthesized value equality would compare references while claiming to compare values.
/// </remarks>
internal abstract class PipelineItem
{
    private protected PipelineItem(ProcessStepOptions? stepOptions)
    {
        StepOptions = stepOptions;
    }

    /// <summary>
    /// Options for the engine step this item becomes and for nothing else, winning field-wise over the
    /// task's own.
    /// </summary>
    internal ProcessStepOptions? StepOptions { get; }
}

/// <summary>
/// One composed stage: its per-stage options and its work — a closed set of exactly two shapes, because a
/// stage either opens the exchange's mailbox or has nothing to do with mailboxes. Splitting them is what
/// lets each shape's work delegate take the arguments it actually needs, so no execution reads a nullable
/// declaration to rediscover which kind of stage it is running. The private constructor keeps the set
/// closed. A stage has no identity of its own beyond its position: it is dispatched by its index in
/// <see cref="ServiceTaskPipeline.Items"/>.
/// </summary>
/// <remarks>
/// Not a record: the only thing that would distinguish two stages is a delegate reference, so value
/// equality would compare identity while claiming to compare value, and nothing needs either.
/// </remarks>
internal abstract class ServiceTaskStage : PipelineItem
{
    private ServiceTaskStage(ProcessStepOptions? stepOptions)
        : base(stepOptions) { }

    /// <summary>A stage with no part in any exchange: work in, stage result out.</summary>
    internal sealed class Plain : ServiceTaskStage
    {
        public Plain(Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work, ProcessStepOptions? stepOptions)
            : base(stepOptions)
        {
            Work = work;
        }

        /// <summary>The stage's work, exactly as the app supplied it.</summary>
        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> Work { get; }
    }

    /// <summary>
    /// The stage that opens the exchange's mailbox and sends its address. Its work is handed the mailbox
    /// as a non-nullable argument, so neither the builder nor the runtime has to assert that the one
    /// stage that must have an address really got one.
    /// </summary>
    internal sealed class MailboxOpening : ServiceTaskStage
    {
        public MailboxOpening(
            Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>> work,
            MailboxOptions declaration,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            Work = work;
            Declaration = declaration;
        }

        /// <summary>The stage's work, handed the mailbox it opened.</summary>
        public Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>> Work { get; }

        /// <summary>
        /// The mailbox declaration. The mint step reads its <see cref="MailboxOptions.Timeout"/>
        /// immediately before this stage runs.
        /// </summary>
        public MailboxOptions Declaration { get; }
    }
}

/// <summary>
/// A reply handler that answers an exchange <strong>without concluding the task</strong>: the mailbox it
/// answers, and the two delegates that answer it. Not the pipeline's conclusion, because the pipeline
/// carries on afterwards — everything composed after it runs once this exchange is over, and only a
/// terminal concludes the task.
/// </summary>
/// <remarks>
/// Deliberately the same shape as <see cref="PipelineConclusion.ReplyExchange"/> and deliberately not the
/// same type: both are items now, so which of the two types the handler is — and nothing about where it
/// sits — is what tells the runtime whether answering the exchange ends the task or starts the pipeline's
/// next leg.
/// </remarks>
internal sealed class ReplySegment : PipelineItem
{
    internal ReplySegment(
        int openingIndex,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> onClosed,
        ProcessStepOptions? stepOptions
    )
        : base(stepOptions)
    {
        OpeningIndex = openingIndex;
        OnMessage = onMessage;
        OnClosed = onClosed;
    }

    /// <summary>
    /// The item that opened the mailbox this handler answers — the exchange's identity in the carry and in
    /// the mint step's engine identity, exactly as for a terminal. A receive step names <em>this handler</em>
    /// by its own item index; which exchange the handler answers is read off here, from composition data
    /// <c>Define</c> fixed, rather than looked up per hop.
    /// </summary>
    internal int OpeningIndex { get; }

    /// <summary>Answers one delivered message, with no way to conclude the task.</summary>
    internal Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> OnMessage { get; }

    /// <summary>Answers the mailbox closing with no message left to handle.</summary>
    internal Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> OnClosed { get; }
}

/// <summary>
/// How a pipeline concludes — a closed set of exactly two shapes, so no execution has to interrogate
/// nullable fields to discover whether a conclusion is secretly also a reply handler. The private
/// constructor keeps the set closed.
/// </summary>
/// <remarks>
/// <para>
/// An ordinary <see cref="PipelineItem"/>, and always the last one: the conclusion is dispatched by its
/// item index like everything else, so a step of a pipeline never has to be identified by the absence of
/// an index. Its <see cref="PipelineItem.StepOptions"/> are the concluding step's alone, winning
/// field-wise over the task's own exactly as a stage's do, and null for a simple
/// <see cref="IServiceTask"/>, whose conclusion is configured by the task-level options and nothing else.
/// </para>
/// <para>
/// Not a record, for the same reason <see cref="ServiceTaskStage"/> is not: both members hold nothing but
/// delegates and an index, so synthesized value equality would compare delegate references, and no caller
/// compares, copies or prints one.
/// </para>
/// </remarks>
internal abstract class PipelineConclusion : PipelineItem
{
    private PipelineConclusion(ProcessStepOptions? stepOptions)
        : base(stepOptions) { }

    /// <summary>
    /// The pipeline ends with one more step — for an <see cref="IServiceTask"/>, its <c>Execute</c>.
    /// </summary>
    internal sealed class FinalStep : PipelineConclusion
    {
        public FinalStep(Func<ServiceTaskContext, Task<ServiceTaskResult>> work, ProcessStepOptions? stepOptions)
            : base(stepOptions)
        {
            Work = work;
        }

        /// <summary>The concluding work.</summary>
        public Func<ServiceTaskContext, Task<ServiceTaskResult>> Work { get; }
    }

    /// <summary>
    /// The pipeline ends with the mailbox exchange a stage opened: <see cref="OnMessage"/> runs once per
    /// delivered message, <see cref="OnClosed"/> once if the mailbox closes with the task still unconcluded.
    /// </summary>
    /// <remarks>
    /// One shape however many messages an exchange carries: whether the app expects one answer or several is
    /// its expectation of the counterparty, not something the runtime records or acts on.
    /// </remarks>
    internal sealed class ReplyExchange : PipelineConclusion
    {
        public ReplyExchange(
            int openingIndex,
            Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
            Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            OpeningIndex = openingIndex;
            OnMessage = onMessage;
            OnClosed = onClosed;
        }

        /// <summary>
        /// The item that opened the mailbox — the exchange's identity in the carry and in the mint step's
        /// engine identity, read off this handler for the reason <see cref="ReplySegment.OpeningIndex"/>
        /// gives.
        /// </summary>
        public int OpeningIndex { get; }

        /// <summary>Answers one delivered message.</summary>
        public Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> OnMessage { get; }

        /// <summary>Answers the mailbox closing with no message left to handle.</summary>
        public Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> OnClosed { get; }
    }
}
