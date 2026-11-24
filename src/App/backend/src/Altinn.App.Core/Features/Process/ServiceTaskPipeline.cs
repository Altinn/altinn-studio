namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task's composed pipeline: its items in composition order, as <see cref="PipelineBuilder.ServiceTask"/>
/// composed them. The runtime reads it to plan, dispatch and validate the task.
/// </summary>
internal sealed class ServiceTaskPipeline
{
    internal ServiceTaskPipeline(IReadOnlyList<ServiceTaskItem> items)
    {
        Items = [.. items];
    }

    /// <summary>
    /// Everything the pipeline composes, in composition order. A position in this list is an item's index: the one
    /// identity every step of the pipeline is dispatched by.
    /// </summary>
    internal IReadOnlyList<ServiceTaskItem> Items { get; }

    /// <summary>
    /// Whether the item at <paramref name="itemIndex"/> is the pipeline's last, so that completing it ends the task.
    /// </summary>
    internal bool IsLast(int itemIndex) => itemIndex >= Items.Count - 1;
}

/// <summary>
/// One composed stage of any pipeline: what its step runs with, and what people following the task see it as. Not a
/// record — items hold delegates, so synthesized value equality would compare references while claiming to compare
/// values.
/// </summary>
internal abstract class PipelineItem
{
    private protected PipelineItem(ProcessStepOptions? stepOptions)
    {
        StepOptions = stepOptions;
    }

    /// <summary>
    /// Options for the engine steps this item becomes and for nothing else. A field left unset falls back to the
    /// command's default and then the engine's.
    /// </summary>
    internal ProcessStepOptions? StepOptions { get; }

    /// <summary>
    /// What the item is called where people follow the task's progress, such as Studio's admin panel: the name
    /// of the method it runs, written out as words, or null when the work is a lambda or says nothing. Display
    /// only: an item's identity is its index, and its name changes nothing about how it runs.
    /// </summary>
    internal string? DisplayName { get; init; }
}

/// <summary>
/// A stage a task runs when it starts, ends or is abandoned: work in, stage result out.
/// </summary>
internal sealed class LifecycleStage : PipelineItem
{
    public LifecycleStage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? stepOptions)
        : base(stepOptions)
    {
        Work = work;
    }

    /// <summary>The stage's work, exactly as the app supplied it.</summary>
    public Func<StageContext, Task<StageResult>> Work { get; }
}

/// <summary>
/// One item of a service task's pipeline — a closed set of exactly two shapes, so dispatch names the one it runs.
/// </summary>
internal abstract class ServiceTaskItem : PipelineItem
{
    private ServiceTaskItem(ProcessStepOptions? stepOptions)
        : base(stepOptions) { }

    /// <summary>A stage that runs as one step: work in, service task result out.</summary>
    internal sealed class Stage : ServiceTaskItem
    {
        public Stage(Func<StageContext, Task<ServiceTaskResult>> work, ProcessStepOptions? stepOptions)
            : base(stepOptions)
        {
            Work = work;
        }

        /// <summary>The stage's work, exactly as the app supplied it.</summary>
        public Func<StageContext, Task<ServiceTaskResult>> Work { get; }
    }

    /// <summary>
    /// A stage that sends to an external system and handles its replies. Its steps share the item's index: a
    /// <c>MintMailbox</c> step and the send in one workflow, then one receive workflow per reply, told apart from
    /// the send by the mailbox receipt the engine hands a receive step.
    /// </summary>
    internal sealed class ExternalStage : ServiceTaskItem
    {
        public ExternalStage(
            Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> send,
            Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> onReply,
            TimeSpan timeout,
            Func<StageContext, Task<ServiceTaskResult>>? onTimeout,
            ProcessStepOptions? stepOptions
        )
            : base(stepOptions)
        {
            Send = send;
            OnReply = onReply;
            Timeout = timeout;
            OnTimeout = onTimeout;
        }

        /// <summary>Sends the message, handed the reply address the mint step opened.</summary>
        public Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> Send { get; }

        /// <summary>Handles one reply.</summary>
        public Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> OnReply { get; }

        /// <summary>How long the reply address accepts replies, from the mint. The mint step reads it.</summary>
        public TimeSpan Timeout { get; }

        /// <summary>
        /// Runs when the reply address closes before a reply handler was done with it, or null to fail the task
        /// then.
        /// </summary>
        public Func<StageContext, Task<ServiceTaskResult>>? OnTimeout { get; }

        /// <summary>
        /// What the receive steps are called where people follow the task's progress: the reply handler's name and
        /// the timeout handler's, since a receive step runs one of the two. <see cref="PipelineItem.DisplayName"/>
        /// names the send.
        /// </summary>
        internal string? ReplyDisplayName { get; init; }
    }
}
