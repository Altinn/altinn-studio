using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Resolves a frozen signing plan and executes one recipient's delegation or notification. Permanent failures
/// fail the recipient's workflow step; transient failures propagate for retry. Only successful work is persisted.
/// </summary>
internal interface ISigneeInitializationService
{
    /// <summary>
    /// Resolves and persists the frozen signee list, or adopts an earlier attempt's saved state.
    /// </summary>
    Task<SigneeInitializationOutcome> ResolveSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    );

    /// <summary>Reads the saved recipient identities after the resolve command's save boundary.</summary>
    Task<SigneeInitializationPlan> GetResolvedSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    );

    /// <summary>Delegates rights to one frozen recipient and persists its successful result.</summary>
    Task ExecuteDelegation(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid signeeStateElementId,
        Guid signeeId,
        Guid workflowId,
        CancellationToken ct
    );

    /// <summary>
    /// Sends one recipient's call to action using a stable task-entry key and persists success. The caller must
    /// retain process ownership and run recipient commands sequentially through their aggregate save boundaries.
    /// A command for an ended or replaced task entry fails without sending or writing.
    /// </summary>
    Task ExecuteNotification(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        Guid signeeStateElementId,
        Guid signeeId,
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
/// A permanent initialization or recipient failure. Transient causes propagate as their original exceptions.
/// </summary>
internal sealed class SigneeInitializationPermanentException(
    string message,
    string errorCode = "SigneeInitializationFailed"
) : SigningException(message)
{
    public string ErrorCode { get; } = errorCode;
}
