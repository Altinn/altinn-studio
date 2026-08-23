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
/// One composed stage: its wire identity, its work, its optional per-stage options, and the mailbox it
/// opens if it is the stage that sends.
/// </summary>
/// <param name="Name">The stage's wire identity.</param>
/// <param name="Work">
/// The stage's work. The mailbox argument is non-null exactly when <paramref name="OpensMailbox"/> is —
/// a plain stage's delegate wrapped the parameter away at composition, so app code never sees it.
/// </param>
/// <param name="StepOptions">Options for this stage's engine step alone.</param>
/// <param name="OpensMailbox">
/// The mailbox declaration, non-null exactly for the declaring stage. The mint step reads its
/// <see cref="MailboxOptions.Timeout"/> immediately before this stage runs.
/// </param>
internal sealed record ServiceTaskStage(
    string Name,
    Func<ServiceTaskContext, ServiceTaskMailbox?, Task<ServiceTaskStageResult>> Work,
    ProcessStepOptions? StepOptions,
    MailboxOptions? OpensMailbox
);

/// <summary>
/// How a pipeline concludes — a closed set of exactly two shapes, so no execution has to interrogate
/// nullable fields to discover whether a conclusion is secretly also a reply handler. The private
/// constructor keeps the set closed.
/// </summary>
internal abstract record PipelineConclusion
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
    internal sealed record FinalStep : PipelineConclusion
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
    internal sealed record ReplyExchange : PipelineConclusion
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
