using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Interface for implementing app-specific logic for delegating signee rights.
/// </summary>
internal interface ISigningDelegationService
{
    /// <summary>
    /// Delegates the task's rights from the instance owner to every signee not yet delegated, recording the
    /// outcome on each signee's state: <see cref="SigneeContextState.IsAccessDelegated"/> on success, a
    /// <see cref="SigneeContextState.DelegationFailure"/> code and reason on a permanent failure. A transient
    /// failure is thrown, so the step is retried; delegation is idempotent per party and task, so a retry that
    /// repeats an earlier signee's delegation is harmless.
    /// </summary>
    Task DelegateRights(
        string taskId,
        string instanceIdCombo,
        Guid instanceOwnerPartyUuid,
        AppIdentifier appIdentifier,
        List<SigneeContext> signeeContexts,
        Guid workflowId,
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
