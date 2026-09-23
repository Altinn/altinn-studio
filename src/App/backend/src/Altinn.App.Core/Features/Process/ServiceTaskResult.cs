namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Base type for the result of executing a service task: how the task concludes. A subtype of
/// <see cref="ServiceTaskExchangeResult"/>, so every one of these answers is also a valid answer from a reply
/// handler — the reverse does not hold.
/// </summary>
public abstract record ServiceTaskResult : ServiceTaskExchangeResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason given on
    /// <see cref="ServiceTaskExchangeResult"/> — read that constructor's remarks before changing this one's
    /// accessibility.
    /// </summary>
    private protected ServiceTaskResult() { }

    /// <summary>
    /// Creates a successful result that completes the service task and advances the process.
    /// </summary>
    /// <param name="action">
    /// Optional process action used to select the next transition (e.g. "reject").
    /// When null, the default BPMN transition is used.
    /// </param>
    /// <remarks>
    /// From a reply handler this also <strong>ends the exchange</strong>: the mailbox closes before anything
    /// downstream starts.
    /// </remarks>
    public static ServiceTaskSuccessResult Success(string? action = null) => new() { Action = action };

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    /// <remarks>
    /// A failed attempt saves nothing. From a reply handler it retries <em>this message</em>, leaving the
    /// exchange open.
    /// </remarks>
    public static ServiceTaskFailedResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskFailedResult { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>Creates a retryable failure with an application-defined diagnostic code.</summary>
    /// <param name="errorMessage">Human-readable explanation of the failure.</param>
    /// <param name="errorCode">Stable code identifying the failure in workflow diagnostics.</param>
    public static ServiceTaskFailedResult FailedRetryable(string errorMessage, string errorCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorCode);
        return FailedRetryable(errorMessage) with { ErrorCode = errorCode };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    /// <remarks>
    /// A failed attempt saves nothing. From a reply handler this <strong>ends the exchange as failed</strong>:
    /// the mailbox is closed first, and whatever waited is not started.
    /// </remarks>
    public static ServiceTaskFailedResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskFailedResult { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }

    /// <summary>Creates a permanent failure with an application-defined diagnostic code.</summary>
    /// <param name="errorMessage">Human-readable explanation of the failure.</param>
    /// <param name="errorCode">Stable code identifying the failure in workflow diagnostics.</param>
    public static ServiceTaskFailedResult FailedPermanent(string errorMessage, string errorCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorCode);
        return FailedPermanent(errorMessage) with { ErrorCode = errorCode };
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
    /// Optional description of what is being waited for, persisted on the step and surfaced on status reads —
    /// phrase it for a reader, not a log parser.
    /// </param>
    /// <remarks>
    /// A deferral is not a failure and is <strong>stateless</strong>: nothing is saved, and instance data
    /// changes made by a deferring attempt are rejected as a contract violation. See
    /// <c>docs/service-task-pipelines.md</c> in the app-lib repository for the waiting contract.
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
    /// Optional process action used to select the next transition (e.g. "reject").
    /// When null, the default BPMN transition is used.
    /// </summary>
    public string? Action { get; init; }
}

/// <summary>
/// Represents a failed result of executing a service task. Construct via
/// <see cref="ServiceTaskResult.FailedRetryable(string)"/> or <see cref="ServiceTaskResult.FailedPermanent(string)"/>.
/// </summary>
public sealed record ServiceTaskFailedResult : ServiceTaskResult
{
    internal ServiceTaskFailedResult() { }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public required string ErrorMessage { get; init; }

    /// <summary>The application's diagnostic code, or null to use the default service-task failure code.</summary>
    public string? ErrorCode { get; init; }

    /// <summary>Whether the failure is retryable or permanent.</summary>
    internal FailureKind Kind { get; init; }
}
