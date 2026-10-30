namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom start task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IOnTaskStartingHandler : IOnTaskLifecycleHandler
{
    /// <summary>
    /// Executes the start task hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HandlerResult.Success"/>,
    /// <see cref="HandlerResult.FailedRetryable"/>, or <see cref="HandlerResult.FailedPermanent"/>.
    /// </returns>
    public Task<HandlerResult> Execute(OnTaskStartingContext context);
}

/// <summary>
/// Parameters for start task hook execution.
/// </summary>
public sealed class OnTaskStartingContext
{
    /// <summary>
    /// The ID of the task this hook is running for (the task being started).
    /// Matches the <c>taskId</c> passed to <see cref="IOnTaskLifecycleHandler.ShouldRunForTask"/>.
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
