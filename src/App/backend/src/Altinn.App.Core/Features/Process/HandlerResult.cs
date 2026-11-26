namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Base type for the results of the process handlers, such as <see cref="IOnTaskStartingHandler"/>. Construct via
/// <see cref="Success"/>, <see cref="FailedRetryable"/>, or <see cref="FailedPermanent"/>.
/// </summary>
public abstract record HandlerResult
{
    /// <summary>
    /// Declares no constructor an app can call: the runtime maps each result by type, as it does
    /// <see cref="ServiceTaskReplyResult"/>'s.
    /// </summary>
    private protected HandlerResult() { }

    /// <summary>
    /// Creates a result representing successful handler execution.
    /// </summary>
    public static HandlerResult Success() => SuccessfulHandlerResult.Instance;

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static HandlerResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedHandlerResult { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static HandlerResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedHandlerResult { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }
}

/// <summary>
/// Represents a successful handler execution.
/// </summary>
internal sealed record SuccessfulHandlerResult : HandlerResult
{
    internal static readonly SuccessfulHandlerResult Instance = new();
}

/// <summary>
/// Represents a failed handler execution. Construct via <see cref="HandlerResult.FailedRetryable"/>
/// or <see cref="HandlerResult.FailedPermanent"/>.
/// </summary>
internal sealed record FailedHandlerResult : HandlerResult
{
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
/// Classifies how a failed handler or service task result should be handled by the workflow engine.
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
