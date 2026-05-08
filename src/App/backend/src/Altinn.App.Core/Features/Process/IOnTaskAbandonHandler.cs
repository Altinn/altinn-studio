namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom abandon task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnTaskAbandonHandler
{
    /// <summary>
    /// Determines whether the hook should run for the given task ID.
    /// </summary>
    /// <param name="taskId">The task ID to check.</param>
    /// <returns>True if the hook should run for this task; otherwise, false.</returns>
    public bool ShouldRunForTask(string taskId);

    /// <summary>
    /// Executes the abandon task hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>An abandon task result indicating success or failure.</returns>
    public Task<OnAbandonHandlerResult> ExecuteAsync(OnTaskAbandonHandlerContext context);
}

/// <summary>
/// Parameters for abandon task hook execution.
/// </summary>
public sealed class OnTaskAbandonHandlerContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }
}

/// <summary>
/// Base type for abandon task hook execution results.
/// </summary>
public abstract record OnAbandonHandlerResult : HookResult
{
    /// <summary>
    /// Creates a result representing successful hook execution.
    /// </summary>
    public static SuccessfulOnAbandonHandlerResult Success() => new();

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnTaskAbandonHandlerResult FailedRetryable(string errorMessage) =>
        new(errorMessage, NonRetryable: false);

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnTaskAbandonHandlerResult FailedPermanent(string errorMessage) =>
        new(errorMessage, NonRetryable: true);
}

/// <summary>
/// Represents a successful abandon task hook execution.
/// </summary>
public sealed record SuccessfulOnAbandonHandlerResult : OnAbandonHandlerResult;

/// <summary>
/// Represents a failed abandon task hook execution.
/// </summary>
/// <param name="ErrorMessage">Human-readable error message describing the failure.</param>
/// <param name="NonRetryable">
/// If true, the workflow engine will not retry this step (permanent failure).
/// If false, the workflow engine will retry with backoff (transient failure).
/// </param>
public sealed record FailedOnTaskAbandonHandlerResult(string ErrorMessage, bool NonRetryable) : OnAbandonHandlerResult;
