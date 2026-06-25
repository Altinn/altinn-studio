namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom end process logic.
/// </summary>
/// <remarks>
/// <para><strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong></para>
/// <para>
/// Unlike the legacy <c>IProcessEnd</c>, this hook does not receive a <c>List&lt;InstanceEvent&gt;</c>. This is
/// intentional: under the per-callback workflow-engine model there is no in-memory events list to mutate, so the
/// parameter was dropped deliberately rather than overlooked.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IOnProcessEndingHandler
{
    /// <summary>
    /// Executes the end process hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>An end process result indicating success or failure.</returns>
    public Task<OnProcessEndingResult> Execute(OnProcessEndingContext context);
}

/// <summary>
/// Parameters for end process hook execution.
/// </summary>
public sealed class OnProcessEndingContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the hook execution.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}

/// <summary>
/// Base type for end process hook execution results.
/// </summary>
public abstract record OnProcessEndingResult : HookResult
{
    /// <summary>
    /// Creates a result representing successful hook execution.
    /// </summary>
    public static SuccessfulOnProcessEndingResult Success() => new();

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnProcessEndingResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedOnProcessEndingResult { ErrorMessage = errorMessage, Kind = FailureKind.Retryable };
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnProcessEndingResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedOnProcessEndingResult { ErrorMessage = errorMessage, Kind = FailureKind.Permanent };
    }
}

/// <summary>
/// Represents a successful end process hook execution.
/// </summary>
public sealed record SuccessfulOnProcessEndingResult : OnProcessEndingResult;

/// <summary>
/// Represents a failed end process hook execution. Construct via
/// <see cref="OnProcessEndingResult.FailedRetryable"/> or <see cref="OnProcessEndingResult.FailedPermanent"/>.
/// </summary>
public sealed record FailedOnProcessEndingResult : OnProcessEndingResult
{
    internal FailedOnProcessEndingResult() { }

    /// <summary>
    /// Human-readable error message describing the failure.
    /// </summary>
    public required string ErrorMessage { get; init; }

    /// <summary>
    /// Whether the failure is retryable or permanent.
    /// </summary>
    internal FailureKind Kind { get; init; }
}
