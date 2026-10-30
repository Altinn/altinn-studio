namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom abandon task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnTaskAbandoningHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Determines whether the hook should run for the given task ID. At most one implementation may run for a task; if
    /// more than one returns true for a task in the process definition, the app does not start. The app calls this when
    /// it plans a transition that abandons the task, not when the hook runs, so the answer must depend on the task ID
    /// alone.
    /// </summary>
    /// <param name="taskId">The task ID to check.</param>
    /// <returns>True if the hook should run for this task; otherwise, false.</returns>
    public bool ShouldRunForTask(string taskId);

    /// <summary>
    /// Executes the abandon task hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HandlerResult.Success"/>,
    /// <see cref="HandlerResult.FailedRetryable"/>, or <see cref="HandlerResult.FailedPermanent"/>.
    /// </returns>
    public Task<HandlerResult> Execute(OnTaskAbandoningContext context);
}

/// <summary>
/// Parameters for abandon task hook execution.
/// </summary>
public sealed class OnTaskAbandoningContext
{
    /// <summary>
    /// The ID of the task this hook is running for (the task being abandoned).
    /// Matches the <c>taskId</c> passed to <see cref="IOnTaskAbandoningHandler.ShouldRunForTask"/>.
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
