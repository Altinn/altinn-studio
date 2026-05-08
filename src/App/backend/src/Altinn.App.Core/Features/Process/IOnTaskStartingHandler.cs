namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom start task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnTaskStartingHandler
{
    /// <summary>
    /// Determines whether the hook should run for the given task ID.
    /// </summary>
    /// <param name="taskId">The task ID to check.</param>
    /// <returns>True if the hook should run for this task; otherwise, false.</returns>
    public bool ShouldRunForTask(string taskId);

    /// <summary>
    /// Executes the start task hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>A start task result indicating success or failure.</returns>
    public Task<OnTaskStartingHandlerResult> ExecuteAsync(OnTaskStartingContext context);
}

/// <summary>
/// Parameters for start task hook execution.
/// </summary>
public sealed class OnTaskStartingContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }
}

/// <summary>
/// Base type for start task hook execution results.
/// </summary>
public abstract record OnTaskStartingHandlerResult : HookResult
{
    /// <summary>
    /// Creates a result representing successful hook execution.
    /// </summary>
    public static SuccessfulOnTaskStartingHandlerResult Success() => new();

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry the step with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnTaskStartingHandlerResult FailedRetryable(string errorMessage) =>
        new(errorMessage, NonRetryable: false);

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying
    /// and mark the step as failed immediately.
    /// Use this for errors that won't resolve by retrying (validation failure, missing config, bad data, etc.).
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static FailedOnTaskStartingHandlerResult FailedPermanent(string errorMessage) =>
        new(errorMessage, NonRetryable: true);
}

/// <summary>
/// Represents a successful start task hook execution.
/// </summary>
public sealed record SuccessfulOnTaskStartingHandlerResult : OnTaskStartingHandlerResult;

/// <summary>
/// Represents a failed start task hook execution.
/// </summary>
/// <param name="ErrorMessage">Human-readable error message describing the failure.</param>
/// <param name="NonRetryable">
/// If true, the workflow engine will not retry this step (permanent failure).
/// If false, the workflow engine will retry with backoff (transient failure).
/// </param>
public sealed record FailedOnTaskStartingHandlerResult(string ErrorMessage, bool NonRetryable)
    : OnTaskStartingHandlerResult;
