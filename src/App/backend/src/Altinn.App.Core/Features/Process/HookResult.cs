namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Base type for task hook execution results. Construct via <see cref="Success"/>,
/// <see cref="FailedRetryable"/>, or <see cref="FailedPermanent"/>.
/// </summary>
public abstract record HookResult
{
    /// <summary>
    /// Creates a result representing successful hook execution.
    /// </summary>
    public static SuccessfulHookResult Success() => new();

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedHookResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedHookResult { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedHookResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedHookResult { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }
}

/// <summary>
/// Represents a successful hook execution.
/// </summary>
public sealed record SuccessfulHookResult : HookResult;

/// <summary>
/// Represents a failed hook execution. Construct via <see cref="HookResult.FailedRetryable"/>
/// or <see cref="HookResult.FailedPermanent"/>.
/// </summary>
public sealed record FailedHookResult : HookResult
{
    internal FailedHookResult() { }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public required string ErrorMessage { get; init; }

    /// <summary>
    /// Whether the failure is retryable or permanent.
    /// </summary>
    internal FailureKind Kind { get; init; }
}

/// <summary>
/// Classifies how a failed hook or service task result should be handled by the workflow engine.
/// </summary>
internal enum FailureKind
{
    /// <summary>
    /// The failure is transient. The workflow engine will retry the step with backoff.
    /// </summary>
    Retryable,

    /// <summary>
    /// The failure is permanent. The workflow engine will stop retrying and mark the step as failed.
    /// </summary>
    Permanent,
}
