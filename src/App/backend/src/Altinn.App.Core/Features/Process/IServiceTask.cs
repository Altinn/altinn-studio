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
    public Guid? WorkflowId { get; init; }

    /// <summary>
    /// How many times this task has been retried after a retryable failure
    /// (<see cref="ServiceTaskResult.FailedRetryable"/>, or an unhandled exception). <c>0</c> on the
    /// first run.
    /// </summary>
    /// <remarks>
    /// Counts consecutive failures <em>since the last deferral</em>, not attempts across the task's whole
    /// life — deferring resets it, so a long wait does not arrive with its retry allowance spent. A task
    /// that has polled for hours without genuinely failing reads <c>0</c> here and a high
    /// <see cref="DeferCount"/>.
    /// </remarks>
    public int RetryCount { get; init; }

    /// <summary>
    /// The instant the engine stops waiting for <em>this attempt</em> and treats it as a retryable
    /// failure — derived from <see cref="ProcessStepOptions.MaxExecutionTime"/>, or the engine default.
    /// </summary>
    /// <remarks>
    /// <see cref="CancellationToken"/> enforces this but only reports being cut off. The deadline lets
    /// the task decide beforehand: with 10 seconds left and a 30-second call to make,
    /// <see cref="ServiceTaskResult.Defer"/> earns a fresh full budget instead of a recorded failure.
    /// Distinct from <see cref="WaitDeadline"/>, which bounds the whole wait rather than one attempt.
    /// </remarks>
    public DateTimeOffset? ExecutionDeadline { get; init; }

    /// <summary>
    /// How many times this task has already deferred (<see cref="ServiceTaskResult.Defer"/>) while waiting
    /// for its outcome. <c>0</c> on the first run, so a task can tell an opening attempt from a re-check
    /// and, for instance, poll eagerly at first and then back off.
    /// </summary>
    public int DeferCount { get; init; }

    /// <summary>
    /// The instant at which this task's wait allowance runs out and the engine will fail the step, or
    /// <c>null</c> before the first deferral — nothing is being waited on yet, so the whole allowance
    /// (<see cref="ProcessStepOptions.WaitBudget"/>, or the engine default) is still ahead.
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would already have aged by the time the task
    /// reads it. Compare against the current time to decide whether one more re-check is worth
    /// attempting, or to fail with a message of your own rather than letting the budget expire.
    /// </remarks>
    public DateTimeOffset? WaitDeadline { get; init; }
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
    /// Optional description of what is being waited for. Recorded in the engine log, not shown to users.
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
    /// <see cref="ServiceTaskContext.DeferCount"/> and <see cref="ServiceTaskContext.WaitDeadline"/> to
    /// pace the wait or give up early on your own terms.
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
