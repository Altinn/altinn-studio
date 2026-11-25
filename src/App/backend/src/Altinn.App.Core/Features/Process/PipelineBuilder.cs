namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a pipeline of durable stages: <see cref="Lifecycle"/> for the work a task does when it starts, ends or is
/// abandoned, and <see cref="ServiceTask"/> for a service task. Every call appends and returns the same builder, and
/// the runtime reads what was composed when the <c>Define</c> method returns. Authoring guidance:
/// <c>src/App/backend/docs/service-task-pipelines.md</c> in the altinn-studio repository.
/// </summary>
public abstract class PipelineBuilder
{
    // The private constructor closes the family to the variants nested here.
    private PipelineBuilder() { }

    /// <summary>
    /// Composes the work a task does when it starts, ends or is abandoned, in
    /// <see cref="Internal.Process.ProcessTasks.IProcessTask.DefineStart"/>, <c>DefineEnd</c> or <c>DefineAbandon</c>.
    /// These stages run inside the transition, so none of them can end a task.
    /// </summary>
    public sealed class Lifecycle : PipelineBuilder
    {
        private readonly List<LifecycleStage> _stages = [];

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
            ArgumentNullException.ThrowIfNull(work);
            options?.Validate();
            _stages.Add(new LifecycleStage(work, options) { DisplayName = PipelineStepNames.FromMethod(work) });
            return this;
        }

        /// <summary>
        /// The stages composed so far, in composition order.
        /// </summary>
        internal ProcessTaskPipeline ToPipeline() => new(_stages);
    }

    /// <summary>
    /// Composes a service task's pipeline in <see cref="IServiceTask.DefineExecute"/>: one or more stages, run in
    /// composition order. Any step can end the task with <see cref="ServiceTaskResult.EndTask"/>; otherwise the task
    /// ends after the last item completes.
    /// </summary>
    public sealed class ServiceTask : PipelineBuilder
    {
        /// <summary>
        /// How long an external stage's reply address accepts replies when its composition gives no timeout.
        /// </summary>
        // Replies come within minutes; the wait rides out an outage on the other side, such as one over a holiday
        // weekend. Longer leaves an instance with a broken integration waiting unseen. Shorter fails tasks for good on
        // ordinary outages, since a closed address refuses late replies.
        internal static readonly TimeSpan DefaultReplyTimeout = TimeSpan.FromDays(7);

        /// <summary>
        /// The longest timeout an external stage may give: the workflow engine's default <c>MaxMailboxTimeout</c>.
        /// An engine configured with a lower cap refuses to open the reply address, which app startup cannot check,
        /// so the stage's first step fails then.
        /// </summary>
        internal static readonly TimeSpan MaxReplyTimeout = TimeSpan.FromDays(21);

        private readonly List<ServiceTaskItem> _items = [];

        /// <summary>
        /// Not constructible by apps: the runtime hands <c>DefineExecute</c> a fresh builder and reads what it
        /// composed.
        /// </summary>
        internal ServiceTask() { }

        /// <summary>
        /// Adds a durable stage, run in composition order. A completed stage never runs again; a retry or resume
        /// re-enters the pipeline at the failed stage. For a polling stage, return
        /// <see cref="ServiceTaskResult.Defer"/> until the outcome arrives.
        /// </summary>
        /// <param name="work">
        /// The stage's work. <strong>MUST be idempotent — it may be retried on failure</strong>; use
        /// <see cref="StageContext.StepId"/> as the idempotency key for calls the stage must not repeat.
        /// </param>
        /// <param name="options">
        /// Optional execution options for the step this stage runs as: its timeout, retry strategy and wait budget.
        /// A field left unset falls back to the command's default and then the engine's.
        /// </param>
        public ServiceTask Stage(Func<StageContext, Task<ServiceTaskResult>> work, ProcessStepOptions? options = null)
        {
            ArgumentNullException.ThrowIfNull(work);
            options?.Validate();
            _items.Add(new ServiceTaskItem.Stage(work, options) { DisplayName = PipelineStepNames.FromMethod(work) });
            return this;
        }

        /// <summary>
        /// Adds a stage that sends a message to an external system and waits for its replies. A reply address is
        /// opened before the send; the send publishes it, and each reply that comes back to it runs
        /// <paramref name="onReply"/> as a durable step of its own.
        /// </summary>
        /// <param name="send">
        /// Sends the message with the reply address. Idempotent, like any stage's work: a retried send is handed the
        /// same address. <see cref="ServiceTaskResult.Completed"/> means sent, now wait for replies.
        /// </param>
        /// <param name="onReply">
        /// Handles one reply: <see cref="ServiceTaskReplyResult.AwaitNextReply"/> to wait for the next,
        /// <see cref="ServiceTaskReplyResult.Completed"/> to carry on with the next item.
        /// </param>
        /// <param name="timeout">
        /// How long the reply address accepts replies, from when it is opened. Defaults to 7 days, and may be at
        /// most 21 days.
        /// </param>
        /// <param name="onTimeout">
        /// Runs when the reply address closes before a reply handler is done with it: the timeout ran out, or an
        /// operator closed it. <see cref="ServiceTaskResult.Completed"/> carries on without the replies. Without
        /// it, the task fails.
        /// </param>
        /// <param name="options">
        /// Optional execution options for the send and for each reply: their timeout, retry strategy and wait
        /// budget.
        /// </param>
        public ServiceTask ExternalStage(
            Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> send,
            Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> onReply,
            TimeSpan? timeout = null,
            Func<StageContext, Task<ServiceTaskResult>>? onTimeout = null,
            ProcessStepOptions? options = null
        )
        {
            ArgumentNullException.ThrowIfNull(send);
            ArgumentNullException.ThrowIfNull(onReply);
            if (timeout is { } given)
            {
                ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(given, TimeSpan.Zero, nameof(timeout));
                ArgumentOutOfRangeException.ThrowIfGreaterThan(given, MaxReplyTimeout, nameof(timeout));
            }
            options?.Validate();

            _items.Add(
                new ServiceTaskItem.ExternalStage(send, onReply, timeout ?? DefaultReplyTimeout, onTimeout, options)
                {
                    DisplayName = PipelineStepNames.FromMethod(send),
                    ReplyDisplayName = PipelineStepNames.FromMethods(onReply, onTimeout),
                }
            );
            return this;
        }

        /// <summary>
        /// The items composed so far, in composition order.
        /// </summary>
        internal ServiceTaskPipeline ToPipeline() => new(_items);
    }
}
