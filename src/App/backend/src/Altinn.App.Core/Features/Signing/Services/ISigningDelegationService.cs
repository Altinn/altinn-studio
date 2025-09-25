using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Interface for implementing app-specific logic for delegating signee rights.
/// </summary>
internal interface ISigningDelegationService
{
    /// <summary>
    /// Delegate signee rights for the instance to a given party from the instance owner.
    /// </summary>
    Task<(List<SigneeContext>, bool success)> DelegateSigneeRights(
        string taskId,
        string instanceIdCombo,
        Guid? instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        CancellationToken ct
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
        CancellationToken ct
    );
}
