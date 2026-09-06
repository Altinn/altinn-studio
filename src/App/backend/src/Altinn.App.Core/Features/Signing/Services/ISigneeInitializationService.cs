using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// The three operations that initialise the signees of a runtime-delegated signing task, each run as a step of
/// its own by the signing task's commands: resolve the signees and persist their initial state, delegate rights
/// to each, and send each the call to action. Every operation resumes from the persisted signee state, so a
/// retried or resumed step skips what earlier attempts recorded.
/// </summary>
/// <remarks>
/// Failure contract: a transient failure (a dependency that did not answer, a throttled call) is thrown, so the
/// engine retries the step and nothing from the attempt is persisted. A permanent failure that concerns one
/// signee is recorded on that signee and the operation continues with the others. A permanent failure that
/// concerns every signee is recorded on every signee still waiting for the operation, or, when nothing can
/// proceed at all, thrown as <see cref="SigneeInitializationPermanentException"/>.
/// </remarks>
internal interface ISigneeInitializationService
{
    /// <summary>
    /// Resolves the signees through the app's <see cref="ISigneeProvider"/>, looks up their parties and persists
    /// the signee-state element with every flag unset. An element tagged with the task that already exists — in
    /// the callback state or in Storage — is adopted instead, so a retried attempt never consults the provider
    /// again and never creates a second element. Elements of the type not tagged with the task (from before
    /// elements were tagged, or from another visit) are removed first.
    /// </summary>
    Task<SigneeInitializationOutcome> ResolveSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    );

    /// <summary>
    /// Delegates rights to every signee not yet delegated and persists the outcome per signee.
    /// </summary>
    Task ExecuteDelegation(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid workflowId,
        CancellationToken ct
    );

    /// <summary>
    /// Sends the call to action to every delegated signee not yet messaged, with an idempotency key derived from
    /// the workflow, the step and the signee so a repeated send is deduplicated by Correspondence, and persists
    /// the outcome per signee.
    /// </summary>
    Task ExecuteNotification(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid workflowId,
        Guid stepId,
        CancellationToken ct
    );
}

/// <summary>
/// The outcome of <see cref="ISigneeInitializationService.ResolveSignees"/>.
/// </summary>
internal abstract record SigneeInitializationOutcome
{
    private SigneeInitializationOutcome() { }

    /// <summary>The signees are resolved and their state is persisted (or was already).</summary>
    public sealed record Completed : SigneeInitializationOutcome
    {
        public static readonly Completed Instance = new();
    }

    /// <summary>
    /// The task's configuration violates the signing contract (no or several providers with the configured id, or
    /// the like). Nothing was done; retrying cannot help.
    /// </summary>
    public sealed record ContractViolation(string Message) : SigneeInitializationOutcome;
}

/// <summary>
/// A permanent failure that concerns every signee and stops the operation outright: the instance owner or the
/// signee state cannot be resolved. Never thrown for a transient cause, which propagates as the original exception.
/// </summary>
internal sealed class SigneeInitializationPermanentException(string message) : SigningException(message);
