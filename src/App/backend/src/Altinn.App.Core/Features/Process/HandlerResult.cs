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
        return new FailedHandlerResult(errorMessage, FailureKind.Retryable);
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
        return new FailedHandlerResult(errorMessage, FailureKind.Permanent);
    }
}

/// <summary>
/// Represents a successful handler execution. Created via <see cref="HandlerResult.Success"/>.
/// </summary>
public sealed record SuccessfulHandlerResult : HandlerResult
{
    internal static readonly SuccessfulHandlerResult Instance = new();

    private SuccessfulHandlerResult() { }
}

/// <summary>
/// Represents a failed handler execution. Created via <see cref="HandlerResult.FailedRetryable"/>
/// or <see cref="HandlerResult.FailedPermanent"/>.
/// </summary>
public sealed record FailedHandlerResult : HandlerResult
{
    internal FailedHandlerResult(string errorMessage, FailureKind kind)
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
