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
    /// Replaces the record's synthesized member printer, which would otherwise read every public
    /// property — including <see cref="Mailbox"/>, whose getter throws in every execution that is not
    /// the declaring stage. That is almost every execution, so the synthesized <c>ToString</c> would
    /// throw from a debug log, a debugger watch, or an assertion-failure message, with a reason that
    /// is misleading out of that context. Here <see cref="Mailbox"/> prints as its address or
    /// <c>&lt;none&gt;</c>, and never throws.
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
        return true;
    }
}
