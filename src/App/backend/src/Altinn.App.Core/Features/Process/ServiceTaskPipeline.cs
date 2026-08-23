namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: the ordered durable stages and the one conclusion — a concluding
/// step, or the handlers that answer the mailbox a stage opened. Built via
/// <see cref="ServiceTaskPipelineBuilder"/> and returned from
/// <see cref="IPipelineServiceTask.Define"/>; the runtime reads it to expand, dispatch and
/// validate the task — apps only compose and return it.
/// </summary>
public sealed class ServiceTaskPipeline
{
    internal ServiceTaskPipeline(IReadOnlyList<ServiceTaskStage> stages, PipelineConclusion conclusion)
    {
        Stages = stages;
        Conclusion = conclusion;
    }

    /// <summary>The durable stages, in execution order. Empty for a simple service task.</summary>
    internal IReadOnlyList<ServiceTaskStage> Stages { get; }

    /// <summary>How the task concludes: a final step, or an exchange's reply handlers.</summary>
    internal PipelineConclusion Conclusion { get; }

    /// <summary>
    /// The stage with the given name (exact match — stage names are our own wire values), or
    /// <c>null</c>.
    /// </summary>
    internal ServiceTaskStage? FindStage(string stageName) =>
        Stages.FirstOrDefault(s => string.Equals(s.Name, stageName, StringComparison.Ordinal));
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
internal abstract class ServiceTaskStage
{
    private ServiceTaskStage(string name, ProcessStepOptions? stepOptions)
    {
        Name = name;
        StepOptions = stepOptions;
    }

    /// <summary>
    /// The stage's wire identity: the engine step's name, what a callback dispatches on, and — for the
    /// declaring stage — the exchange's identity everywhere downstream.
    /// </summary>
    internal string Name { get; }

    /// <summary>Options for this stage's engine step alone.</summary>
    internal ProcessStepOptions? StepOptions { get; }

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
    /// Single-message and multi-message exchanges are the same shape here: the compile-time split did its
    /// work at the API boundary, and a single-message handler wraps to <see cref="OnMessage"/>'s signature
    /// without loss, its results being a subtype. The runtime treats every exchange uniformly.
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
