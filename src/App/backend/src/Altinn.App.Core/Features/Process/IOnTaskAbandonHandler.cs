namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom abandon task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnTaskAbandonHandler : IProcessStepConfigurable
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
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HookResult.Success"/>,
    /// <see cref="HookResult.FailedRetryable"/>, or <see cref="HookResult.FailedPermanent"/>.
    /// </returns>
    public Task<HookResult> Execute(OnTaskAbandonContext context);
}

/// <summary>
/// Parameters for abandon task hook execution.
/// </summary>
public sealed class OnTaskAbandonContext
{
    /// <summary>
    /// The ID of the task this hook is running for (the task being abandoned).
    /// Matches the <c>taskId</c> passed to <see cref="IOnTaskAbandonHandler.ShouldRunForTask"/>.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the hook execution.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}
