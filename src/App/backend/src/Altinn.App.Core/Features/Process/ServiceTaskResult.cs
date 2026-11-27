namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a service task's stage, an external stage's send and its <c>onTimeout</c> return. A subtype of
/// <see cref="ServiceTaskReplyResult"/>, so every one of these is also a valid answer from a reply handler.
/// </summary>
public abstract record ServiceTaskResult : ServiceTaskReplyResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason given on <see cref="ServiceTaskReplyResult"/> —
    /// read that constructor's remarks before changing this one's accessibility.
    /// </summary>
    private protected ServiceTaskResult() { }

    /// <summary>
    /// This step is done: the next item runs, or, after the last item, the task ends with the default flow. From
    /// a send, the message is sent and the stage waits for replies. Data changes are saved.
    /// </summary>
    public static new ServiceTaskResult Completed() => CompletedServiceTaskResult.Instance;

    /// <summary>
    /// Ends the task now: later items never run, an open reply address closes, and the process moves on.
    /// </summary>
    /// <param name="action">
    /// Optional process action that picks the next flow (e.g. "reject"). When null, the default flow is used.
    /// </param>
    public static new ServiceTaskResult EndTask(string? action = null) => new EndedServiceTaskResult(action);

    /// <summary>
    /// The step ran without error, but the outcome it awaits has not arrived yet: run it again after
    /// <paramref name="delay"/>. A deferral is stateless: a deferring attempt must not change instance data.
    /// </summary>
    /// <param name="delay">
    /// How long to wait before this step runs again. <see cref="ProcessStepOptions.WaitBudget"/> caps the total.
    /// </param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads. Phrase it for a reader.
    /// </param>
    public static new ServiceTaskResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new DeferredServiceTaskResult(delay, reason);
    }

    /// <summary>
    /// A transient failure, such as an external service being down: the workflow engine runs the step again,
    /// with backoff. A failed attempt saves nothing.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static new ServiceTaskResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskResult(errorMessage, FailureKind.Retryable);
    }

    /// <summary>
    /// A failure no retry fixes, such as bad data or missing configuration: the step fails at once. A failed
    /// attempt saves nothing, and an open reply address stays open, so a resume runs the step again.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static new ServiceTaskResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskResult(errorMessage, FailureKind.Permanent);
    }
}

/// <summary>
/// A service task step that is done. Created via <see cref="ServiceTaskResult.Completed"/>.
/// </summary>
public sealed record CompletedServiceTaskResult : ServiceTaskResult
{
    internal static readonly CompletedServiceTaskResult Instance = new();

    private CompletedServiceTaskResult() { }
}

/// <summary>
/// A service task step that ends the task. Created via <see cref="ServiceTaskResult.EndTask"/>.
/// </summary>
public sealed record EndedServiceTaskResult : ServiceTaskResult
{
    internal EndedServiceTaskResult(string? action)
    {
        Action = action;
    }

    /// <summary>
    /// Optional process action that picks the next flow (e.g. "reject"). When null, the default flow is used.
    /// </summary>
    public string? Action { get; }
}

/// <summary>
/// A service task step that ran without error but is still waiting for an external outcome.
/// Created via <see cref="ServiceTaskResult.Defer"/>.
/// </summary>
public sealed record DeferredServiceTaskResult : ServiceTaskResult
{
    internal DeferredServiceTaskResult(TimeSpan delay, string? reason)
    {
        Delay = delay;
        Reason = reason;
    }

    /// <summary>
    /// How long to wait before running the step again.
    /// </summary>
    public TimeSpan Delay { get; }

    /// <summary>
    /// Optional description of what is being waited for.
    /// </summary>
    public string? Reason { get; }
}

/// <summary>
/// A failed service task step. Created via <see cref="ServiceTaskResult.FailedRetryable"/> or
/// <see cref="ServiceTaskResult.FailedPermanent"/>.
/// </summary>
public sealed record FailedServiceTaskResult : ServiceTaskResult
{
    internal FailedServiceTaskResult(string errorMessage, FailureKind kind)
    {
        ErrorMessage = errorMessage;
        Kind = kind;
    }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public string ErrorMessage { get; }

    /// <summary>
    /// Whether the step runs again.
    /// </summary>
    public FailureKind Kind { get; }
}
