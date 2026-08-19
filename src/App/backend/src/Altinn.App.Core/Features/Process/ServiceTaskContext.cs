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
    /// <see cref="ServiceTaskPipeline.WithReplyFrom"/>. Publish <see cref="ServiceTaskMailbox.Id"/>
    /// in the outbound message as the address the answer must come back on.
    /// </summary>
    /// <remarks>
    /// Available in the declaring stage and <strong>nowhere else</strong> — reading it from any
    /// other stage, from the conclusion, or from a task that declares no mailbox throws
    /// <see cref="InvalidOperationException"/> naming where it <em>is</em> available. A mailbox
    /// belongs to the stage that sends: an address nobody published is an address nobody can answer,
    /// so handing it to steps that cannot publish it would only invite it to be published twice.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// This execution is not the stage the mailbox was declared for.
    /// </exception>
    public ServiceTaskMailbox Mailbox =>
        MailboxOrDefault
        ?? throw new InvalidOperationException(
            MailboxUnavailableReason
                ?? $"{nameof(ServiceTaskContext)}.{nameof(Mailbox)} is not available in this execution. A mailbox "
                    + $"is opened by declaring {nameof(ServiceTaskPipeline.WithReplyFrom)} on the pipeline, and is "
                    + "readable only in the stage it names."
        );

    /// <summary>
    /// The mailbox minted for this execution, or <c>null</c> when this execution is not the
    /// declaring stage. The nullable half of <see cref="Mailbox"/>, kept internal so app code has one
    /// way to read a mailbox and gets an explanation rather than a <c>null</c> when there is none.
    /// </summary>
    internal ServiceTaskMailbox? MailboxOrDefault { get; init; }

    /// <summary>
    /// Why <see cref="Mailbox"/> is unavailable, phrased for whoever tried to read it — the caller
    /// knows which pipeline and which step this is, and the context does not.
    /// </summary>
    internal string? MailboxUnavailableReason { get; init; }

    /// <summary>
    /// The message this execution is answering, on the conclusion of a pipeline that declared
    /// <see cref="ServiceTaskPipeline.WithReplyFrom"/>. <c>null</c> means exactly one thing:
    /// <em>the mailbox is closed and no message can ever reach this execution — conclude the
    /// exchange</em>; <see cref="ReplyClosedReason"/> says why it closed, for the wording.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Available on the conclusion of a declaring pipeline and <strong>nowhere else</strong> —
    /// reading it from a stage, or from a task that declares no mailbox, throws
    /// <see cref="InvalidOperationException"/> naming where it <em>is</em> available. It throws
    /// rather than answering <c>null</c> on purpose: <c>null</c> already means "the exchange is
    /// over, conclude it", so an execution that can never carry a message must not be able to
    /// impersonate one that lost its mailbox.
    /// </para>
    /// <para>
    /// The two cases are told apart by the engine, not guessed from an empty body: a sender that
    /// delivers an empty message produces a <see cref="ServiceTaskReply"/> whose
    /// <see cref="ServiceTaskReply.Payload"/> is empty, never a <c>null</c> here. So
    /// <c>if (context.Reply is not { } reply)</c> is the closing signal and nothing else — answer it
    /// with a verdict (<see cref="ServiceTaskResult.Success"/> for a degraded-but-acceptable
    /// outcome, <see cref="ServiceTaskResult.FailedPermanent"/> naming what never arrived) and never
    /// with <see cref="ServiceTaskResult.AwaitNextReply"/>.
    /// </para>
    /// <para>
    /// Whether a message stands at this execution's position is settled before the execution can
    /// first run, so every attempt, retry and operational resume reads the same answer.
    /// </para>
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// This execution does not answer a mailbox message.
    /// </exception>
    public ServiceTaskReply? Reply =>
        ReplyUnavailableReason is { } reason ? throw new InvalidOperationException(reason) : ReplyOrDefault;

    /// <summary>
    /// Why the mailbox closed, on the execution where <see cref="Reply"/> is <c>null</c>;
    /// <c>null</c> whenever <see cref="Reply"/> carries a message. Exactly one of the two is present.
    /// </summary>
    /// <remarks>
    /// For the conclusion's wording only — both reasons demand the same response. Throws wherever
    /// <see cref="Reply"/> throws, and for the same reason.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// This execution does not answer a mailbox message.
    /// </exception>
    public MailboxClosedReason? ReplyClosedReason =>
        ReplyUnavailableReason is { } reason
            ? throw new InvalidOperationException(reason)
            : MailboxClosedReasonOrDefault;

    /// <summary>
    /// The message handed to this execution, or <c>null</c> when the mailbox closed without one. The
    /// nullable half of <see cref="Reply"/> that carries no "this execution answers nothing"
    /// meaning, kept internal so app code has exactly one way to read a message.
    /// </summary>
    internal ServiceTaskReply? ReplyOrDefault { get; init; }

    /// <summary>
    /// The closure reason behind a <c>null</c> <see cref="ReplyOrDefault"/> on an execution that
    /// answers a mailbox. Set exactly when this execution answers a mailbox and no message stands at
    /// its position.
    /// </summary>
    internal MailboxClosedReason? MailboxClosedReasonOrDefault { get; init; }

    /// <summary>
    /// Why <see cref="Reply"/> and <see cref="ReplyClosedReason"/> are unavailable — non-null exactly
    /// when this execution does not answer a mailbox message, which is every stage and every
    /// conclusion of a task that declares no mailbox.
    /// </summary>
    internal string? ReplyUnavailableReason { get; init; }

    /// <summary>
    /// Replaces the record's synthesized member printer, which would otherwise read every public
    /// property — including <see cref="Mailbox"/>, <see cref="Reply"/> and
    /// <see cref="ReplyClosedReason"/>, whose getters throw in every execution they are not meant
    /// for. That is almost every execution, so the synthesized <c>ToString</c> would throw from a
    /// debug log, a debugger watch, or an assertion-failure message, with a reason that is
    /// misleading out of that context. Here each of the three prints from its non-throwing internal
    /// half, so this method must only ever read those.
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

    /// <summary>
    /// The message, the closure that stands in for one, or the fact that this execution answers no
    /// mailbox at all — read only from the internal halves, never from the throwing getters.
    /// </summary>
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
