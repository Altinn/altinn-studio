namespace Altinn.App.Core.Features.Process;

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
    /// <remarks>
    /// From a declaring pipeline's conclusion this also <strong>ends the exchange</strong>: the mailbox closes
    /// before anything downstream starts.
    /// </remarks>
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
    /// <remarks>
    /// Like a deferral, a failed attempt saves nothing: instance data changes made before the
    /// failure are discarded, and the retry starts from exactly the state this attempt received.
    /// From a declaring pipeline's conclusion it retries <em>this message</em>, leaving the exchange open. A
    /// handler that will answer the same every time holds the exchange to its deadline; conclude with
    /// <see cref="FailedPermanent"/> instead.
    /// </remarks>
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
    /// <remarks>
    /// <para>
    /// Like a deferral, a failed attempt saves nothing: instance data changes made before the
    /// failure are discarded, and a retry or operational resume starts from exactly the state
    /// this attempt received.
    /// </para>
    /// <para>
    /// From a declaring pipeline's conclusion it <strong>ends the exchange as failed</strong>: the mailbox is
    /// closed first, and whatever waited is not started. Data changes are still discarded — a conclusion that
    /// must <em>record</em> something records it and answers <see cref="Success"/>.
    /// </para>
    /// </remarks>
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
    /// A deferral is not a failure (no error recorded, retry counter reset) and is
    /// <strong>stateless</strong>: nothing is saved, and instance data changes made by a deferring
    /// attempt are rejected as a contract violation. Work that produces something durable belongs
    /// before the wait, in its own pipeline stage (<see cref="IPipelineServiceTask"/>) — for
    /// send-then-poll, give the send its own stage and let <c>Finally</c> poll: a completed stage
    /// never re-runs.
    /// </para>
    /// <para>
    /// Waiting is bounded by <see cref="ProcessStepOptions.WaitBudget"/> (or the engine default);
    /// expiry fails the step under its own classification. Read <see cref="ServiceTaskContext.Wait"/>
    /// to pace the wait or give up early. Never branch on anything under
    /// <see cref="ServiceTaskContext.Attempt"/> or <see cref="ServiceTaskContext.Wait"/> to guard a
    /// side effect — an attempt that sends and crashes re-runs with all of those unchanged; use
    /// <see cref="ServiceTaskContext.StepId"/> as the outbound idempotency key instead.
    /// </para>
    /// </remarks>
    public static ServiceTaskDeferredResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new ServiceTaskDeferredResult { Delay = delay, Reason = reason };
    }

    /// <summary>
    /// This message is handled; the exchange is not over. Only a declaring pipeline's conclusion may return it,
    /// for exchanges of more than one message.
    /// </summary>
    /// <remarks>
    /// An ordinary successful completion: data changes are saved, and the state travels on — publish what the
    /// next message should see. The task stays unconcluded until a later message answers with
    /// <see cref="Success"/>/<see cref="FailedPermanent"/> or the mailbox's timeout runs out. Returning it from
    /// the closing signal, or outside an exchange, is rejected non-retryably.
    /// </remarks>
    public static ServiceTaskAwaitNextReplyResult AwaitNextReply() => ServiceTaskAwaitNextReplyResult.Instance;
}

/// <summary>
/// A conclusion handler finished its message while the exchange stays open. Created via
/// <see cref="ServiceTaskResult.AwaitNextReply"/>; carries nothing.
/// </summary>
public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskResult
{
    internal static readonly ServiceTaskAwaitNextReplyResult Instance = new();

    internal ServiceTaskAwaitNextReplyResult() { }
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
