using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Interface for service tasks that can be executed during a process.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - service tasks may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IProcessTask, IProcessStepConfigurable
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}

/// <summary>
/// This class represents the parameters for executing a service task.
/// </summary>
public sealed record ServiceTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to read and modify the instance data during the service task execution.
    /// </summary>
    /// <remarks>
    /// Changes are saved after Execute returns a successful result — including a deferral
    /// (<see cref="ServiceTaskResult.Defer"/>), so a polling task can record what it learned and read it
    /// back on its next attempt. Keep in mind that data elements from previous tasks are locked.
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
    /// of these unchanged. Evidence of a side effect lives in <see cref="Checkpoints"/>.
    /// </remarks>
    public ServiceTaskWait Wait { get; init; } = new();

    /// <summary>
    /// Durable checkpoints — the send guard for send-then-poll tasks. Written immediately, read
    /// through to Storage; see <see cref="ServiceTaskCheckpoints"/>.
    /// </summary>
    /// <remarks>
    /// The runtime wires the Storage-backed store; a context constructed outside the runtime (an
    /// app's unit test) defaults to working in-memory checkpoint semantics without any setup.
    /// </remarks>
    public ServiceTaskCheckpoints Checkpoints { get; init; } =
        new(new InMemoryServiceTaskCheckpointStore(), CancellationToken.None);
}

/// <summary>
/// The per-attempt clock of a <see cref="ServiceTaskContext"/>: one execution, bounded by
/// <see cref="ProcessStepOptions.MaxExecutionTime"/>. Distinct from <see cref="ServiceTaskWait"/>,
/// which bounds the whole wait across attempts.
/// </summary>
public sealed record ServiceTaskAttempt
{
    /// <summary>
    /// How many times this task has been retried after a retryable failure
    /// (<see cref="ServiceTaskResult.FailedRetryable"/>, or an unhandled exception). <c>0</c> on the
    /// first run.
    /// </summary>
    /// <remarks>
    /// Counts consecutive failures <em>since the last deferral</em>, not attempts across the task's whole
    /// life — deferring resets it, so a long wait does not arrive with its retry allowance spent. A task
    /// that has polled for hours without genuinely failing reads <c>0</c> here and a high
    /// <see cref="ServiceTaskWait.DeferCount"/>.
    /// </remarks>
    public int RetryCount { get; init; }

    /// <summary>
    /// The instant the engine stops waiting for <em>this attempt</em> and treats it as a retryable
    /// failure — derived from <see cref="ProcessStepOptions.MaxExecutionTime"/>, or the engine default.
    /// </summary>
    /// <remarks>
    /// <see cref="ServiceTaskContext.CancellationToken"/> enforces this but only reports being cut off.
    /// The deadline lets the task decide beforehand: with 10 seconds left and a 30-second call to make,
    /// <see cref="ServiceTaskResult.Defer"/> earns a fresh full budget instead of a recorded failure.
    /// Distinct from <see cref="ServiceTaskWait.Deadline"/>, which bounds the whole wait rather than
    /// one attempt.
    /// </remarks>
    public DateTimeOffset? Deadline { get; init; }
}

/// <summary>
/// The whole-wait clock of a <see cref="ServiceTaskContext"/>: every check a deferring task makes,
/// bounded by <see cref="ProcessStepOptions.WaitBudget"/>. Distinct from
/// <see cref="ServiceTaskAttempt"/>, which bounds one execution.
/// </summary>
public sealed record ServiceTaskWait
{
    /// <summary>
    /// How many times this task has already deferred (<see cref="ServiceTaskResult.Defer"/>) while waiting
    /// for its outcome. <c>0</c> on the first run, so a task can tell an opening attempt from a re-check
    /// and, for instance, poll eagerly at first and then back off.
    /// </summary>
    public int DeferCount { get; init; }

    /// <summary>
    /// When this task first deferred — the instant its wait began — or <c>null</c> before the first
    /// deferral. Brackets the wait together with <see cref="Deadline"/>, so a polling task can pace
    /// itself progressively (check often early, sparsely late) without bookkeeping of its own.
    /// </summary>
    public DateTimeOffset? StartedAt { get; init; }

    /// <summary>
    /// The instant at which this task's wait allowance runs out and the engine will fail the step, or
    /// <c>null</c> before the first deferral — nothing is being waited on yet, so the whole allowance
    /// (<see cref="ProcessStepOptions.WaitBudget"/>, or the engine default) is still ahead.
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would already have aged by the time the task
    /// reads it.
    /// </remarks>
    public DateTimeOffset? Deadline { get; init; }

    /// <summary>
    /// How much of the wait allowance is left before <see cref="Deadline"/>, floored at zero — or
    /// <c>null</c> before the first deferral, when the whole allowance is still ahead.
    /// </summary>
    public TimeSpan? Remaining =>
        Deadline is { } deadline
            ? deadline - DateTimeOffset.UtcNow is { Ticks: > 0 } remaining
                ? remaining
                : TimeSpan.Zero
            : null;

    /// <summary>
    /// <c>true</c> when the wait allowance is spent: this run is the task's final check, and a further
    /// <see cref="ServiceTaskResult.Defer"/> will fail the step as expired. Use it to end the wait on
    /// your own terms — <see cref="ServiceTaskResult.FailedPermanent"/> with a message that names what
    /// never arrived reads better than a generic expiry.
    /// </summary>
    public bool IsFinalCheck => Deadline is { } deadline && DateTimeOffset.UtcNow >= deadline;
}

/// <summary>
/// Durable checkpoints for a service task — the send guard for send-then-poll work, stored as
/// instance data values keyed <c>serviceTask:{Type}:{key}</c>.
/// </summary>
/// <remarks>
/// Checkpoints are instance metadata: visible to anyone who can read the instance, retained for
/// the instance's lifetime (a useful audit trail), and sized for identifiers and markers — never
/// secrets or documents. To scope a value to one pass through the task, put the pass identity in
/// the value (e.g. <c>$"{context.WorkflowId}:{receiptId}"</c>) and compare on re-entry — a repeated
/// visit to the task (BPMN round trip) reads the earlier pass's checkpoint and must decide
/// deliberately whether to skip, fail, or redo.
/// </remarks>
public sealed class ServiceTaskCheckpoints
{
    private readonly IServiceTaskCheckpointStore _store;
    private readonly CancellationToken _cancellationToken;

    internal ServiceTaskCheckpoints(IServiceTaskCheckpointStore store, CancellationToken cancellationToken)
    {
        _store = store;
        _cancellationToken = cancellationToken;
    }

    /// <summary>
    /// Records a checkpoint. Written to Storage immediately — deliberately <em>not</em> part of the
    /// save-on-success unit of work, because its job is to survive an attempt that fails after a side
    /// effect. Record the receipt in the same attempt that sends, and branch on <see cref="Get"/> —
    /// never on engine bookkeeping like <see cref="ServiceTaskWait.DeferCount"/>.
    /// </summary>
    /// <param name="key">Checkpoint name, unique within this task type.</param>
    /// <param name="value">The evidence to record; overwrites any previous value for the key.</param>
    public Task Set(string key, string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentNullException.ThrowIfNull(value);
        return _store.Set(key, value, _cancellationToken);
    }

    /// <summary>
    /// Reads a checkpoint recorded by <see cref="Set"/>, or <c>null</c> when none exists. Reads
    /// through to Storage (fetched once per attempt) rather than this attempt's execution snapshot,
    /// so a checkpoint written by a crashed attempt is visible to its retry. A failed read throws
    /// instead of returning <c>null</c> — <c>null</c> strictly means "never recorded", so a send
    /// guard can trust it.
    /// </summary>
    /// <param name="key">Checkpoint name, unique within this task type.</param>
    public Task<string?> Get(string key)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        return _store.Get(key, _cancellationToken);
    }
}

/// <summary>
/// Base type for the result of executing a service task.
/// </summary>
public abstract record ServiceTaskResult
{
    /// <summary>
    /// Creates a service task result representing successful execution.
    /// The process will automatically advance to the next element.
    /// </summary>
    /// <param name="action">
    /// Optional action to use when advancing (e.g. "reject").
    /// When null, the default BPMN transition is used.
    /// </param>
    public static ServiceTaskSuccessResult Success(string? action = null) => new() { Action = action };

    /// <summary>
    /// Creates a service task result representing successful execution
    /// without automatic process advancement. The instance will remain
    /// at the service task until manually advanced.
    /// </summary>
    public static ServiceTaskSuccessResult SuccessWithoutAutoAdvance() => new() { AutoAdvanceProcess = false };

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskFailedResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskFailedResult { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskFailedResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskFailedResult { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }

    /// <summary>
    /// Creates a deferral: the task ran without error, but the outcome it awaits has not arrived yet.
    /// The engine parks the process on this task — releasing its worker, holding no lease — and runs the
    /// task again after <paramref name="delay"/>. Use it for "start now, confirm later" work: a
    /// dispatched shipment, a payment capture, a signing order.
    /// </summary>
    /// <param name="delay">
    /// How long to wait before this task runs again — this re-check only;
    /// <see cref="ProcessStepOptions.WaitBudget"/> caps the total.
    /// </param>
    /// <param name="reason">
    /// Optional description of what is being waited for. Persisted on the step and surfaced on status
    /// reads — the ops dashboard, and the <c>workflow.waitingReason</c> annotation on the app's process
    /// reads, where a frontend may display it — so phrase it for a reader, not a log parser.
    /// </param>
    /// <remarks>
    /// <para>
    /// A deferral is not a failure: it records no error and resets the retry counter. Data changes are
    /// saved on every attempt that makes them, exactly as for a successful result, and the next attempt
    /// sees them — so the instance is where a polling task keeps what it learned. Those writes must be
    /// idempotent, which <see cref="IServiceTask"/> already requires.
    /// </para>
    /// <para>
    /// Waiting is bounded by <see cref="ProcessStepOptions.WaitBudget"/> (or the engine default); expiry
    /// fails the step under its own classification, distinct from an execution failure. Read
    /// <see cref="ServiceTaskContext.Wait"/> (<see cref="ServiceTaskWait.DeferCount"/>,
    /// <see cref="ServiceTaskWait.Remaining"/>, <see cref="ServiceTaskWait.IsFinalCheck"/>) to pace the
    /// wait or give up early on your own terms.
    /// </para>
    /// <para>
    /// The send-then-poll pattern — dispatch once, then defer until the outcome arrives — hinges on the
    /// send guard being durable: record the dispatch receipt with
    /// <c>context.Checkpoints.Set</c> <em>in the same attempt that sends</em> and branch on
    /// <c>context.Checkpoints.Get</c> (see <see cref="ServiceTaskCheckpoints"/>). Never branch on
    /// anything under <see cref="ServiceTaskContext.Attempt"/> or <see cref="ServiceTaskContext.Wait"/>:
    /// the engine records an attempt only after it
    /// answers, so an attempt that sends and crashes re-runs with all of those unchanged. Use
    /// <see cref="ServiceTaskContext.StepId"/> as the outbound idempotency key: it covers the residual
    /// crash window between the send and the checkpoint write, being the one value the crashed attempt
    /// and its retry share by construction.
    /// </para>
    /// </remarks>
    public static ServiceTaskDeferredResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new ServiceTaskDeferredResult { Delay = delay, Reason = reason };
    }
}

/// <summary>
/// Represents a service task that ran without error but is still waiting for an external outcome.
/// Created via <see cref="ServiceTaskResult.Defer"/>.
/// </summary>
public sealed record ServiceTaskDeferredResult : ServiceTaskResult
{
    /// <summary>
    /// How long to wait before running the task again.
    /// </summary>
    public required TimeSpan Delay { get; init; }

    /// <summary>
    /// Optional description of what is being waited for.
    /// </summary>
    public string? Reason { get; init; }
}

/// <summary>
/// Represents a successful result of executing a service task.
/// </summary>
public sealed record ServiceTaskSuccessResult : ServiceTaskResult
{
    /// <summary>
    /// If true, the process will automatically advance to the next element after the service task completes.
    /// Defaults to true.
    /// </summary>
    public bool AutoAdvanceProcess { get; init; } = true;

    /// <summary>
    /// Optional action to use when auto-advancing (e.g. "reject" to abandon the current task).
    /// Only used when <see cref="AutoAdvanceProcess"/> is true. When null, the default BPMN transition is used.
    /// </summary>
    public string? Action { get; init; }
}

/// <summary>
/// Represents a failed result of executing a service task. Construct via
/// <see cref="ServiceTaskResult.FailedRetryable"/> or <see cref="ServiceTaskResult.FailedPermanent"/>.
/// </summary>
public sealed record ServiceTaskFailedResult : ServiceTaskResult
{
    internal ServiceTaskFailedResult() { }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public required string ErrorMessage { get; init; }

    /// <summary>
    /// Whether the failure is retryable or permanent.
    /// </summary>
    internal FailureKind Kind { get; init; }
}
