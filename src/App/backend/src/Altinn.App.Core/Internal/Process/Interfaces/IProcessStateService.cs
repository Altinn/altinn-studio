using System.Security.Claims;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Service for converting and enriching process state information with authorization details.
/// </summary>
public interface IProcessStateService
{
    /// <summary>
    /// Gets the authorized process state for a given instance.
    /// </summary>
    /// <param name="org">The organization</param>
    /// <param name="app">The application</param>
    /// <param name="instanceOwnerPartyId">The instance owner party ID</param>
    /// <param name="instanceGuid">The instance GUID</param>
    /// <param name="user">The user to check authorization for</param>
    /// <returns>AppProcessState with authorization details</returns>
    Task<AppProcessState> GetProcessState(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        ClaimsPrincipal user
    );

    /// <summary>
    /// Converts a ProcessState to AppProcessState and enriches it with authorization information.
    /// </summary>
    /// <param name="instance">The instance containing the process</param>
    /// <param name="processState">The process state to convert</param>
    /// <param name="user">The user to check authorization for</param>
    /// <returns>AppProcessState with authorization details</returns>
    Task<AppProcessState> ConvertAndAuthorizeActions(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user
    );
}
