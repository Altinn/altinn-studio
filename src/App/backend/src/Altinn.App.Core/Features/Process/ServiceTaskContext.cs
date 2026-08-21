using System.Globalization;
using System.Text;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// This class represents the parameters for executing a service task — a pipeline stage, or the
/// concluding step (an <see cref="IServiceTask"/>'s <c>Execute</c>).
/// </summary>
public sealed record ServiceTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to read and modify the instance data during the service task execution.
    /// </summary>
    /// <remarks>
    /// Changes are saved when execution completes (a stage's <c>Completed</c>, or the task's
    /// concluding result) — and in a pipeline, saved changes are visible to every later stage. A
    /// <em>deferring</em> attempt is stateless: nothing is saved, and data changes made before a
    /// deferral are rejected (see <see cref="ServiceTaskResult.Defer"/>). Keep in mind that data
    /// elements from previous tasks are locked.
    /// </remarks>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;

    /// <summary>
    /// The engine-assigned id of the workflow executing this service task. Stable across retries of
    /// the same process transition; a new visit to the task runs under a new workflow id. Service
    /// tasks with external side effects can use it to tell a retried attempt apart from a genuinely
    /// new pass through the task.
    /// </summary>
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step executing this task. Stable across every attempt of the step
    /// — retries and deferral re-checks alike — which makes it a ready-made idempotency key for an
    /// outbound call the task must not repeat (dispatch a shipment once, then poll). A new visit to the
    /// task runs under a new step id.
    /// </summary>
    /// <remarks>
    /// An idempotency key alone does not decide whether a <em>superseding</em> workflow (after a reject,
    /// or a written-off failure) may repeat the call — that is a business rule, guarded by durable
    /// evidence the task records in instance data via <see cref="InstanceDataMutator"/>.
    /// </remarks>
    public required Guid StepId { get; init; }

    /// <summary>
    /// Reference time for this execution: the explicit workflow schedule when present, otherwise the
    /// persisted time when the workflow step was enqueued.
    /// </summary>
    /// <remarks>Provided by the workflow engine as <c>Workflow.StartAt ?? Step.CreatedAt</c>.</remarks>
    public DateTimeOffset ExecutionReferenceTime { get; internal init; }

    /// <summary>
    /// The clock bounding <em>this attempt</em> (<see cref="ProcessStepOptions.MaxExecutionTime"/>):
    /// how many consecutive errors preceded it, and when it is cut off.
    /// </summary>
    public ServiceTaskAttempt Attempt { get; init; } = new();

    /// <summary>
    /// The clock bounding <em>the whole wait</em> (<see cref="ProcessStepOptions.WaitBudget"/>):
    /// which check this is, when the wait began and ends, and how much allowance is left.
    /// </summary>
    /// <remarks>
    /// Everything here is a pacing signal, never an idempotency guard: the engine records an attempt
    /// only after it answers, so an attempt that performed a side effect and crashed re-runs with all
    /// of these unchanged.
    /// </remarks>
    public ServiceTaskWait Wait { get; init; } = new();

    /// <summary>
    /// The mailbox this stage opens, when the pipeline declared one for it with
    /// <see cref="ServiceTaskPipeline.WithReplyFrom"/>. Publish <see cref="ServiceTaskMailbox.Id"/> in the
    /// outbound message as the reply address. Available in the declaring stage and nowhere else; anywhere
    /// else it throws, naming where it <em>is</em> available.
    /// </summary>
    /// <exception cref="InvalidOperationException">Not the declaring stage.</exception>
    public ServiceTaskMailbox Mailbox =>
        MailboxOrDefault
        ?? throw new InvalidOperationException(
            MailboxUnavailableReason
                ?? $"{nameof(ServiceTaskContext)}.{nameof(Mailbox)} is not available in this execution. A mailbox "
                    + $"is opened by declaring {nameof(ServiceTaskPipeline.WithReplyFrom)} on the pipeline, and is "
                    + "readable only in the stage it names."
        );

    /// <summary>The nullable half of <see cref="Mailbox"/>; app code gets one way to read it.</summary>
    internal ServiceTaskMailbox? MailboxOrDefault { get; init; }

    internal string? MailboxUnavailableReason { get; init; }

    /// <summary>
    /// The message this execution answers, on the conclusion of a declaring pipeline. <c>null</c> means
    /// exactly one thing: <em>the mailbox is closed and no message can ever arrive — conclude the
    /// exchange</em> (<see cref="ReplyClosedReason"/> has the wording); never answer it with
    /// <see cref="ServiceTaskResult.AwaitNextReply"/>. An empty delivered message is an empty
    /// <see cref="ServiceTaskReply.Payload"/>, never <c>null</c> here, and every attempt reads the same
    /// answer. Anywhere else this throws rather than answering <c>null</c>, so an execution that can never
    /// carry a message cannot impersonate one whose exchange ended.
    /// </summary>
    /// <exception cref="InvalidOperationException">This execution does not answer a mailbox message.</exception>
    public ServiceTaskReply? Reply =>
        ReplyUnavailableReason is { } reason ? throw new InvalidOperationException(reason) : ReplyOrDefault;

    /// <summary>
    /// Why the mailbox closed, when <see cref="Reply"/> is <c>null</c>. Wording only — both reasons demand
    /// the same response. Throws wherever <see cref="Reply"/> throws.
    /// </summary>
    /// <exception cref="InvalidOperationException">This execution does not answer a mailbox message.</exception>
    public MailboxClosedReason? ReplyClosedReason =>
        ReplyUnavailableReason is { } reason
            ? throw new InvalidOperationException(reason)
            : MailboxClosedReasonOrDefault;

    internal ServiceTaskReply? ReplyOrDefault { get; init; }

    internal MailboxClosedReason? MailboxClosedReasonOrDefault { get; init; }

    /// <summary>Non-null exactly when this execution does not answer a mailbox message.</summary>
    internal string? ReplyUnavailableReason { get; init; }

    /// <summary>
    /// The synthesized printer would read the throwing getters, so <c>ToString</c> would throw from a debug
    /// log or a debugger watch. This must only ever read the non-throwing internal halves.
    /// </summary>
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append("InstanceDataMutator = ").Append(InstanceDataMutator);
        builder.Append(", CancellationToken = ").Append(CancellationToken.ToString());
        builder.Append(", WorkflowId = ").Append(WorkflowId.ToString());
        builder.Append(", StepId = ").Append(StepId.ToString());
        builder
            .Append(", ExecutionReferenceTime = ")
            .Append(ExecutionReferenceTime.ToString(CultureInfo.InvariantCulture));
        builder.Append(", Attempt = ").Append(Attempt);
        builder.Append(", Wait = ").Append(Wait);
        builder.Append(", Mailbox = ").Append(MailboxOrDefault is { } mailbox ? mailbox.ToString() : "<none>");
        builder.Append(", Reply = ").Append(DescribeReply());
        return true;
    }

    private string DescribeReply()
    {
        if (ReplyUnavailableReason is not null)
        {
            return "<none>";
        }

        return ReplyOrDefault is { } reply
            ? reply.ToString()
            : $"<closed: {MailboxClosedReasonOrDefault?.ToString() ?? "unknown"}>";
    }
}
