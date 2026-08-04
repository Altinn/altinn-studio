namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The result of a non-final pipeline step (<see cref="IServiceTaskStep{TOut}"/> /
/// <see cref="IServiceTaskStep{TIn, TOut}"/>). Construct via the
/// <see cref="ServiceTaskStepResult"/> factories. Note what is deliberately missing compared to
/// <see cref="ServiceTaskResult"/>: a non-final step cannot conclude the task or advance the
/// process — that is reserved for <see cref="IFinalServiceTaskStep{TIn}"/>.
/// </summary>
/// <typeparam name="TOut">The step's declared output type.</typeparam>
public abstract record ServiceTaskStepResult<TOut>
{
    private protected ServiceTaskStepResult() { }

    internal abstract ServiceTaskStepOutcome ToOutcome();

    /// <summary>
    /// Lets a step return the type-agnostic <see cref="ServiceTaskStepResult.Defer"/> without
    /// naming its output type.
    /// </summary>
    public static implicit operator ServiceTaskStepResult<TOut>(ServiceTaskStepDeferral deferral) =>
        new DeferredServiceTaskStepResult<TOut>(deferral.Delay, deferral.Reason);

    /// <summary>
    /// Lets a step return the type-agnostic <see cref="ServiceTaskStepResult.FailedRetryable"/> /
    /// <see cref="ServiceTaskStepResult.FailedPermanent"/> without naming its output type.
    /// </summary>
    public static implicit operator ServiceTaskStepResult<TOut>(ServiceTaskStepFailure failure) =>
        new FailedServiceTaskStepResult<TOut>(failure.ErrorMessage, failure.Kind);
}

/// <summary>
/// Factories for <see cref="ServiceTaskStepResult{TOut}"/> — the outcomes available to a non-final
/// pipeline step.
/// </summary>
public static class ServiceTaskStepResult
{
    /// <summary>
    /// The step is done: hand <paramref name="output"/> to the next step and let the pipeline
    /// advance. The value is serialized as JSON into the workflow's callback state, durably — once
    /// this result is recorded, the step never runs again.
    /// </summary>
    /// <param name="output">The value the next step receives as its input. Must not be null.</param>
    public static ServiceTaskStepResult<TOut> Next<TOut>(TOut output)
    {
        ArgumentNullException.ThrowIfNull(output);
        return new NextServiceTaskStepResult<TOut>(output);
    }

    /// <summary>
    /// The step ran without error, but the outcome it awaits has not arrived yet: run this step
    /// again after <paramref name="delay"/>, with the same input. Semantics are identical to
    /// <see cref="ServiceTaskResult.Defer"/> — no error is recorded, the retry counter resets, and
    /// the wait is bounded by the step's <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="delay">How long to wait before this step runs again — this re-check only.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads — phrase it for a
    /// reader, not a log parser.
    /// </param>
    public static ServiceTaskStepDeferral Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new ServiceTaskStepDeferral { Delay = delay, Reason = reason };
    }

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry this step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskStepFailure FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskStepFailure { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying and mark
    /// the step as failed immediately. Use this for errors that won't resolve by retrying
    /// (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskStepFailure FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new ServiceTaskStepFailure { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }
}

/// <summary>
/// A step deferral created via <see cref="ServiceTaskStepResult.Defer"/>. Converts implicitly to
/// <see cref="ServiceTaskStepResult{TOut}"/> for any output type.
/// </summary>
public sealed record ServiceTaskStepDeferral
{
    internal ServiceTaskStepDeferral() { }

    /// <summary>
    /// How long to wait before running the step again.
    /// </summary>
    public required TimeSpan Delay { get; init; }

    /// <summary>
    /// Optional description of what is being waited for.
    /// </summary>
    public string? Reason { get; init; }
}

/// <summary>
/// A step failure created via <see cref="ServiceTaskStepResult.FailedRetryable"/> or
/// <see cref="ServiceTaskStepResult.FailedPermanent"/>. Converts implicitly to
/// <see cref="ServiceTaskStepResult{TOut}"/> for any output type.
/// </summary>
public sealed record ServiceTaskStepFailure
{
    internal ServiceTaskStepFailure() { }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public required string ErrorMessage { get; init; }

    /// <summary>
    /// Whether the failure is retryable or permanent.
    /// </summary>
    internal FailureKind Kind { get; init; }
}

internal sealed record NextServiceTaskStepResult<TOut>(TOut Output) : ServiceTaskStepResult<TOut>
{
    internal override ServiceTaskStepOutcome ToOutcome() => new ServiceTaskStepOutcome.Next(Output!);
}

internal sealed record DeferredServiceTaskStepResult<TOut>(TimeSpan Delay, string? Reason) : ServiceTaskStepResult<TOut>
{
    internal override ServiceTaskStepOutcome ToOutcome() => new ServiceTaskStepOutcome.Deferred(Delay, Reason);
}

internal sealed record FailedServiceTaskStepResult<TOut>(string ErrorMessage, FailureKind Kind)
    : ServiceTaskStepResult<TOut>
{
    internal override ServiceTaskStepOutcome ToOutcome() => new ServiceTaskStepOutcome.Failed(ErrorMessage, Kind);
}
