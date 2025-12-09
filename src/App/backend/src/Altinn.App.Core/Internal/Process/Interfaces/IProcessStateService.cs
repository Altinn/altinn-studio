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
    /// Converts a ProcessState to AppProcessState and enriches it with authorization information.
    /// </summary>
    /// <param name="instance">The instance containing the process</param>
    /// <param name="processState">The process state to convert</param>
    /// <param name="user">The user to check authorization for</param>
    /// <returns>AppProcessState with authorization details</returns>
    Task<AppProcessState> GetAuthorizedProcessState(
        Instance instance,
        ProcessState? processState,
        ClaimsPrincipal user
    );
}
