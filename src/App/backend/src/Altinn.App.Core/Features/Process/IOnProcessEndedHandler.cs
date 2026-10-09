namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom logic after the process has ended.
/// </summary>
/// <remarks>
/// <para><strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong></para>
/// <para>
/// Runs after the ended process state is saved to Storage, and before the configured process-end cleanup
/// (<c>autoDeleteOnProcessEnd</c>) and the release of the instance. A failure here cannot stop the process from
/// ending; it leaves the ended instance processing until resumed. Logic that must be able to stop the process from
/// ending belongs in an <see cref="IOnTaskEndingHandler"/> for the last task.
/// </para>
/// <para>An app registers at most one implementation; with more, it does not start.</para>
/// </remarks>
[ImplementableByApps]
public interface IOnProcessEndedHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Executes the ended process hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HookResult.Success"/>,
    /// <see cref="HookResult.FailedRetryable"/>, or <see cref="HookResult.FailedPermanent"/>.
    /// </returns>
    public Task<HookResult> Execute(OnProcessEndedContext context);
}

/// <summary>
/// Parameters for ended process hook execution.
/// </summary>
public sealed class OnProcessEndedContext
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
