using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using static Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal interface ISigningService
{
    /// <summary>
    /// Resolves, delegates and notifies the task's signees in one go, and stores the outcome as the task's signee
    /// state. For a transition enqueued before these became separate steps; see <see cref="ResolveSignees"/>,
    /// <see cref="DelegateSigneeRights"/> and <see cref="NotifySignees"/> for how each part handles failures.
    /// </summary>
    Task InitializeSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        Guid stepId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resolves the task's signees through the app's signee provider and stores them, not yet delegated or
    /// notified, as the task's signee state, replacing any earlier state.
    /// </summary>
    Task ResolveSignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Delegates the task's signing rights to every signee in the signee state not yet delegated, and records the
    /// outcome there. A failure that concerns one signee is recorded on that signee; any other failure is thrown
    /// for the step to be retried, without recording anything.
    /// </summary>
    Task DelegateSigneeRights(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends the call to sign to every delegated signee in the signee state not yet notified, and records the
    /// outcome there. A transient failure is thrown for the step to be retried; every other failure is recorded on
    /// the signee. Each message carries an idempotency key derived from <paramref name="stepId"/>, so a retried
    /// step does not notify anyone twice.
    /// </summary>
    Task NotifySignees(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        Guid stepId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the organization signees the current user is authorized to sign on behalf of.
    /// </summary>
    Task<List<OrganizationSignee>> GetAuthorizedOrganizationSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        int userId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the list of signee contexts.
    /// </summary>
    Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Aborts runtime delegated signing. Deletes all signing data and revokes delegated access.
    /// </summary>
    Task AbortRuntimeDelegatedSigning(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Revokes any delegated signee access rights for the current task without touching signing data,
    /// so that the rights don't outlive the task that granted them.
    /// </summary>
    Task RevokeSigneeRightsOnTaskEnd(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken cancellationToken = default
    );
}
