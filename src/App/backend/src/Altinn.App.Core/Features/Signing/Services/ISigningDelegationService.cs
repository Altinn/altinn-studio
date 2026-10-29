using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Interface for implementing app-specific logic for delegating signee rights.
/// </summary>
internal interface ISigningDelegationService
{
    /// <summary>
    /// Delegates signee rights for the instance from the instance owner to every signee not yet delegated,
    /// recording the outcome on each signee's state. A failure that concerns only one signee is recorded on that
    /// signee; any other failure is thrown, leaving the signees reached so far marked as delegated.
    /// </summary>
    Task DelegateSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Revoke signee rights for the instance to a given party from the instance owner.
    /// </summary>
    Task<(List<SigneeContext>, bool success)> RevokeSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken cancellationToken
    );
}
