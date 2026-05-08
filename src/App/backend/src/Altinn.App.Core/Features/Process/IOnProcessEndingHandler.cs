namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom end process logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnProcessEndingHandler
{
    /// <summary>
    /// Executes the end process hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>An end process result indicating success or failure.</returns>
    public Task<OnProcessEndingHandlerResult> ExecuteAsync(OnProcessEndingHandlerContext context);
}

/// <summary>
/// Parameters for end process hook execution.
/// </summary>
public sealed class OnProcessEndingHandlerContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }
}

/// <summary>
/// Base type for end process hook execution results.
/// </summary>
public abstract record OnProcessEndingHandlerResult : HookResult
{
    /// <summary>
    /// Creates a result representing successful hook execution.
    /// </summary>
    public static SuccessfulOnProcessEndingHandlerResult Success() => new();

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnProcessEndingHandlerResult FailedRetryable(string errorMessage) =>
        new(errorMessage, NonRetryable: false);

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnProcessEndingHandlerResult FailedPermanent(string errorMessage) =>
        new(errorMessage, NonRetryable: true);
}

/// <summary>
/// Represents a successful end process hook execution.
/// </summary>
public sealed record SuccessfulOnProcessEndingHandlerResult : OnProcessEndingHandlerResult;

/// <summary>
/// Represents a failed end process hook execution.
/// </summary>
/// <param name="ErrorMessage">Human-readable error message describing the failure.</param>
/// <param name="NonRetryable">
/// If true, the workflow engine will not retry this step (permanent failure).
/// If false, the workflow engine will retry with backoff (transient failure).
/// </param>
public sealed record FailedOnProcessEndingHandlerResult(string ErrorMessage, bool NonRetryable)
    : OnProcessEndingHandlerResult;
