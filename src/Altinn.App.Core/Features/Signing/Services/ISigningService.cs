using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using static Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal interface ISigningService
{
    /// <summary>
    /// Delegates access to the current task, notifies the signees about
    /// a new task to sign and saves the signee contexts to Storage.
    /// </summary>
    Task<List<SigneeContext>> InitializeSignees(
        IInstanceDataMutator instanceDataMutator,
        List<SigneeContext> signeeContexts,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets the organization signees the current user is authorized to sign on behalf of.
    /// </summary>
    Task<List<OrganizationSignee>> GetAuthorizedOrganizationSignees(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        int userId,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets the list of signee contexts.
    /// </summary>
    Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        string? taskIdOverride = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Aborts runtime delegated signing. Deletes all signing data and revokes delegated access.
    /// </summary>
    Task AbortRuntimeDelegatedSigning(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct = default
    );
}
