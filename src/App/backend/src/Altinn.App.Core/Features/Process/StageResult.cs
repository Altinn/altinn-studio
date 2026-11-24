namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The result of a stage a task runs when it starts, ends or is abandoned, composed with
/// <see cref="PipelineBuilder.Lifecycle"/>. Unrelated to <see cref="ServiceTaskResult"/> on purpose: these stages run
/// inside a transition, so none of them can end a service task.
/// </summary>
public abstract record StageResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason <see cref="ServiceTaskReplyResult"/>'s own
    /// constructor gives — read that constructor's remarks before changing this one's accessibility.
    /// </summary>
    private protected StageResult() { }

    /// <summary>
    /// The stage is complete: the pipeline advances. Recorded durably by the engine — a completed
    /// stage never runs again. Data changes made through
    /// <see cref="StageContext.InstanceDataMutator"/> are saved, so the stages after this
    /// one see them.
    /// </summary>
    public static StageResult Completed() => CompletedStageResult.Instance;

    /// <summary>
    /// The stage ran without error, but the outcome it awaits has not arrived yet: run this stage
    /// again after <paramref name="delay"/>. Stateless, no error recorded, retry counter reset, bounded by
    /// the stage's <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="delay">How long to wait before this stage runs again — this re-check only.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads — phrase it for a
    /// reader, not a log parser.
    /// </param>
    public static StageResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new DeferredStageResult(delay, reason);
    }

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry this stage with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// A failed attempt saves nothing: the retry starts from exactly the state this attempt received.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static StageResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedStageResult(errorMessage, FailureKind.Retryable);
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying and mark
    /// the stage as failed immediately. Use this for errors that won't resolve by retrying
    /// (validation failure, missing config, bad data, etc.). A failed attempt saves nothing: an operational
    /// resume re-runs this stage from exactly the state this attempt received.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static StageResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedStageResult(errorMessage, FailureKind.Permanent);
    }
}

internal sealed record CompletedStageResult : StageResult
{
    public static readonly CompletedStageResult Instance = new();
}

internal sealed record DeferredStageResult(TimeSpan Delay, string? Reason) : StageResult;

internal sealed record FailedStageResult(string ErrorMessage, FailureKind Kind) : StageResult;
