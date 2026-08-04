namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The result of a work step in an <see cref="IStagedServiceTask"/> pipeline
/// (<see cref="IServiceTaskStep"/>). Note what is deliberately missing compared to
/// <see cref="ServiceTaskResult"/>: a work step cannot conclude the task or advance the process —
/// that is reserved for the pipeline's <see cref="IFinalServiceTaskStep"/>.
/// </summary>
public abstract record ServiceTaskStepResult
{
    private protected ServiceTaskStepResult() { }

    /// <summary>
    /// The step is done: the pipeline advances to the next step. Recorded durably by the engine —
    /// once this result lands, the step never runs again. Data changes made through
    /// <see cref="ServiceTaskContext.InstanceDataMutator"/> are saved, so the steps after this one
    /// see them.
    /// </summary>
    public static ServiceTaskStepResult Next() => NextServiceTaskStepResult.Instance;

    /// <summary>
    /// The step ran without error, but the outcome it awaits has not arrived yet: run this step
    /// again after <paramref name="delay"/>. Semantics are identical to
    /// <see cref="ServiceTaskResult.Defer"/> — no error is recorded, the retry counter resets, and
    /// the wait is bounded by the step's <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="delay">How long to wait before this step runs again — this re-check only.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads — phrase it for a
    /// reader, not a log parser.
    /// </param>
    /// <remarks>
    /// A deferral is stateless: nothing is saved, and instance data changes made by the deferring
    /// attempt are rejected. A step that checks-and-waits is not a step that records — work that
    /// produces something durable belongs in its own step, completed with <see cref="Next"/>.
    /// </remarks>
    public static ServiceTaskStepResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new DeferredServiceTaskStepResult(delay, reason);
    }

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry this step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskStepResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskStepResult(errorMessage, FailureKind.Retryable);
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying and mark
    /// the step as failed immediately. Use this for errors that won't resolve by retrying
    /// (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskStepResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskStepResult(errorMessage, FailureKind.Permanent);
    }
}

internal sealed record NextServiceTaskStepResult : ServiceTaskStepResult
{
    public static readonly NextServiceTaskStepResult Instance = new();
}

internal sealed record DeferredServiceTaskStepResult(TimeSpan Delay, string? Reason) : ServiceTaskStepResult;

internal sealed record FailedServiceTaskStepResult(string ErrorMessage, FailureKind Kind) : ServiceTaskStepResult;
