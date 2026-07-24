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
public interface IOnProcessEndingHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Executes the end process hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HookResult.Success"/>,
    /// <see cref="HookResult.FailedRetryable"/>, or <see cref="HookResult.FailedPermanent"/>.
    /// </returns>
    public Task<HookResult> Execute(OnProcessEndingContext context);
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
