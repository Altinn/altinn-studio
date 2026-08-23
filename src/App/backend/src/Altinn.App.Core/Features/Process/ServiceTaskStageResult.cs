namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The result of one pipeline stage of an <see cref="IPipelineServiceTask"/>. Note what is
/// deliberately missing compared to <see cref="ServiceTaskResult"/>: a stage cannot conclude the
/// task or advance the process — that is reserved for the pipeline's conclusion, which always runs
/// last (its <c>Finally</c>, or the reply terminal answering the mailbox a stage opened).
/// </summary>
public abstract record ServiceTaskStageResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason <see cref="ServiceTaskExchangeResult"/>'s own
    /// constructor gives: a stage result the runtime cannot map is an author error it has no move for. Read
    /// that constructor's remarks before changing this one's accessibility — what holds the property is one
    /// committed approval file, and only in CI.
    /// </summary>
    private protected ServiceTaskStageResult() { }

    /// <summary>
    /// The stage is complete: the pipeline advances. Recorded durably by the engine — a completed
    /// stage never runs again. Data changes made through
    /// <see cref="ServiceTaskContext.InstanceDataMutator"/> are saved, so the stages after this
    /// one see them.
    /// </summary>
    public static ServiceTaskStageResult Completed() => CompletedServiceTaskStageResult.Instance;

    /// <summary>
    /// The stage ran without error, but the outcome it awaits has not arrived yet: run this stage
    /// again after <paramref name="delay"/>. Semantics are identical to
    /// <see cref="ServiceTaskResult.Defer"/> — no error is recorded, the retry counter resets, and
    /// the wait is bounded by the stage's <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="delay">How long to wait before this stage runs again — this re-check only.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads — phrase it for a
    /// reader, not a log parser.
    /// </param>
    /// <remarks>
    /// A deferral is stateless: nothing is saved, and instance data changes made by the deferring
    /// attempt are rejected. A stage that checks-and-waits is not a stage that records — work that
    /// produces something durable belongs in its own stage, completed with <see cref="Completed"/>.
    /// </remarks>
    public static ServiceTaskStageResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new DeferredServiceTaskStageResult(delay, reason);
    }

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry this stage with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    /// <remarks>
    /// Like a deferral, a failed attempt saves nothing: instance data changes made before the
    /// failure are discarded, and the retry starts from exactly the state this attempt received.
    /// </remarks>
    public static ServiceTaskStageResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskStageResult(errorMessage, FailureKind.Retryable);
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying and mark
    /// the stage as failed immediately. Use this for errors that won't resolve by retrying
    /// (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    /// <remarks>
    /// Like a deferral, a failed attempt saves nothing: instance data changes made before the
    /// failure are discarded, and an operational resume re-runs this stage from exactly the state
    /// this attempt received.
    /// </remarks>
    public static ServiceTaskStageResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskStageResult(errorMessage, FailureKind.Permanent);
    }
}

internal sealed record CompletedServiceTaskStageResult : ServiceTaskStageResult
{
    public static readonly CompletedServiceTaskStageResult Instance = new();
}

internal sealed record DeferredServiceTaskStageResult(TimeSpan Delay, string? Reason) : ServiceTaskStageResult;

internal sealed record FailedServiceTaskStageResult(string ErrorMessage, FailureKind Kind) : ServiceTaskStageResult;
