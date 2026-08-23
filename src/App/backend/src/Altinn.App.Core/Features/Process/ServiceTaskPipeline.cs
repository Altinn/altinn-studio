namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable items and the one conclusion — a concluding
/// step, or the handlers that answer the mailbox a stage opened. Built via
/// <see cref="ServiceTaskPipelineBuilder"/> and returned from
/// <see cref="IPipelineServiceTask.Define"/>; the runtime reads it to expand, dispatch and
/// validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    internal ServiceTaskPipeline(IReadOnlyList<PipelineItem> items, PipelineConclusion conclusion)
    {
        Items = items;
        Conclusion = conclusion;
    }

    /// <summary>
    /// Everything the pipeline composes before its conclusion, in composition order — one list, read by
    /// shape. Empty for a simple service task.
    /// </summary>
    internal IReadOnlyList<PipelineItem> Items { get; }

    /// <summary>How the task concludes: a final step, or an exchange's reply handlers.</summary>
    internal PipelineConclusion Conclusion { get; }

    /// <summary>
    /// The stage with the given name (exact match — stage names are our own wire values), or
    /// <c>null</c>. Filters <see cref="Items"/> down to stages, since a name is a stage's identity and
    /// nothing else's.
    /// </summary>
    internal ServiceTaskStage? FindStage(string stageName) =>
        Items
            .OfType<ServiceTaskStage>()
            .FirstOrDefault(s => string.Equals(s.Name, stageName, StringComparison.Ordinal));

    /// <summary>
    /// The non-terminal handler answering the exchange the named stage opened (exact match, as for a
    /// stage), or <c>null</c> — which for a receive step means the exchange is the conclusion's or nobody's.
    /// </summary>
    /// <remarks>
    /// An exchange is answered exactly once, so the first match is the only one. Unlike
    /// <see cref="FindStage"/> this looks up an <em>exchange's</em> identity rather than a stage's: the two
    /// are the same string in different roles, which is why they are two lookups over one list rather than
    /// one lookup callers filter afterwards.
    /// </remarks>
    internal ReplySegment? FindReplySegment(string openingStageName) =>
        Items
            .OfType<ReplySegment>()
            .FirstOrDefault(r => string.Equals(r.OpeningStageName, openingStageName, StringComparison.Ordinal));
}

/// <summary>
/// One entry in <see cref="ServiceTaskPipeline.Items"/>: something the pipeline does, in composition
/// order, before its conclusion. Callers dispatch on the shape rather than on flags, so a reader that
/// only cares about stages says so (<see cref="ServiceTaskPipeline.FindStage"/>) and everything else in
/// the list stays invisible to it.
/// </summary>
/// <remarks>
/// Not a record, for the reason <see cref="ServiceTaskStage"/> gives: an item holds delegates, so
/// synthesized value equality would compare references while claiming to compare values.
/// </remarks>
internal abstract class PipelineItem
{
    /// <summary>
    /// Non-public, so the set of item shapes stays this assembly's to close — the runtime has nothing to
    /// do with an item it does not recognise.
    /// </summary>
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
/// One composed stage: its wire identity, its per-stage options, and its work — a closed set of exactly
/// two shapes, because a stage either opens the exchange's mailbox or has nothing to do with mailboxes.
/// Splitting them is what lets each shape's work delegate take the arguments it actually needs, so no
/// execution reads a nullable declaration to rediscover which kind of stage it is running. The private
/// constructor keeps the set closed.
/// </summary>
/// <remarks>
/// Not a record: the only thing that would distinguish two stages is a delegate reference, so value
/// equality would compare identity while claiming to compare value, and nothing needs either.
/// </remarks>
internal abstract class ServiceTaskStage : PipelineItem
{
    private ServiceTaskStage(string name, ProcessStepOptions? stepOptions)
        : base(stepOptions)
    {
        Name = name;
    }

    /// <summary>
    /// The stage's wire identity: the engine step's name, what a callback dispatches on, and — for the
    /// declaring stage — the exchange's identity everywhere downstream.
    /// </summary>
    internal string Name { get; }

    /// <summary>A stage with no part in any exchange: work in, stage result out.</summary>
    internal sealed class Plain : ServiceTaskStage
    {
        public Plain(
            string name,
            Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work,
            ProcessStepOptions? stepOptions
        )
            : base(name, stepOptions)
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
            string name,
            Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskStageResult>> work,
            MailboxOptions declaration,
            ProcessStepOptions? stepOptions
        )
            : base(name, stepOptions)
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
/// answers, and the two delegates that answer it. An item rather than a conclusion because the pipeline
/// carries on afterwards — everything composed after it runs once this exchange is over, and only a
/// terminal concludes the task.
/// </summary>
/// <remarks>
/// Deliberately the same shape as <see cref="PipelineConclusion.ReplyExchange"/> and deliberately not the
/// same type: this <see cref="OnMessage"/> answers <see cref="ServiceTaskStageExchangeResult"/> rather than
/// <see cref="ServiceTaskExchangeResult"/>, so concluding the task is not in its vocabulary at all, and
/// where the handler sits in the model — an item, or the conclusion — is what tells the runtime whether
/// answering the exchange ends the task or starts the pipeline's next leg.
/// </remarks>
internal sealed class ReplySegment : PipelineItem
{
    internal ReplySegment(
        string openingStageName,
        Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskStageExchangeResult>> onMessage,
        Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskStageResult>> onClosed,
        ProcessStepOptions? stepOptions
    )
        : base(stepOptions)
    {
        OpeningStageName = openingStageName;
        OnMessage = onMessage;
        OnClosed = onClosed;
    }

    /// <summary>
    /// The stage that opened the mailbox this handler answers — the exchange's identity in the carry, in the
    /// receive workflow's payload and in the mint step's engine identity, exactly as for a terminal.
    /// </summary>
    internal string OpeningStageName { get; }

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
/// Not a record, for the same reason <see cref="ServiceTaskStage"/> is not: both members hold nothing but
/// delegates and a name, so synthesized value equality would compare delegate references, and no caller
/// compares, copies or prints one.
/// </remarks>
internal abstract class PipelineConclusion
{
    private PipelineConclusion(ProcessStepOptions? stepOptions)
    {
        StepOptions = stepOptions;
    }

    /// <summary>
    /// Options declared for the concluding step alone, winning field-wise over the task's own — the
    /// same precedence a stage's options have. Null for a simple <see cref="IServiceTask"/>, whose
    /// conclusion is configured by the task-level options and nothing else.
    /// </summary>
    internal ProcessStepOptions? StepOptions { get; }

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
    /// One shape however many messages an exchange carries: nothing here records whether the app expects one
    /// answer or several — that is its expectation of the counterparty, not something the runtime acts on —
    /// so every exchange is executed uniformly.
    /// </remarks>
    internal sealed class ReplyExchange : PipelineConclusion
    {
        public ReplyExchange(
            string openingStageName,
            Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
            Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            OpeningStageName = openingStageName;
            OnMessage = onMessage;
            OnClosed = onClosed;
        }

        /// <summary>
        /// The stage that opened the mailbox — the exchange's identity in the carry, in the receive
        /// workflow's payload, and in the mint step's engine identity.
        /// </summary>
        public string OpeningStageName { get; }

        /// <summary>Answers one delivered message.</summary>
        public Func<ServiceTaskContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> OnMessage { get; }

        /// <summary>Answers the mailbox closing with no message left to handle.</summary>
        public Func<ServiceTaskContext, MailboxClosedReason, Task<ServiceTaskResult>> OnClosed { get; }
    }
}
