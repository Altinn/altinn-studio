using System.Security.Claims;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Interface;

/// <summary>
/// Interface for authorization functionality.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Auth.IAuthorizationClient instead", error: true)]
public interface IAuthorization
{
    /// <summary>
    /// Returns the list of parties that user has any rights for.
    /// </summary>
    /// <param name="userId">The userId.</param>
    /// <returns>List of parties.</returns>
    Task<List<Party>?> GetPartyList(int userId);

    /// <summary>
    /// Verifies that the selected party is contained in the user's party list.
    /// </summary>
    /// <param name="userId">The user id.</param>
    /// <param name="partyId">The party id.</param>
    /// <returns> Boolean indicating whether or not the user can represent the selected party.</returns>
    Task<bool?> ValidateSelectedParty(int userId, int partyId);

    /// <summary>
    /// Check if the user is authorized to perform the given action on the given instance.
    /// </summary>
    /// <param name="appIdentifier"></param>
    /// <param name="instanceIdentifier"></param>
    /// <param name="user"></param>
    /// <param name="action"></param>
    /// <param name="taskId"></param>
    /// <returns></returns>
    Task<bool> AuthorizeAction(
        AppIdentifier appIdentifier,
        InstanceIdentifier instanceIdentifier,
        ClaimsPrincipal user,
        string action,
        string? taskId = null
    );
}
