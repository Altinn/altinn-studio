using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// Interface for authorization functionality.
/// </summary>
public interface IAuthorizationClient
{
    /// <summary>
    /// Returns the list of parties the authenticated user can act on behalf of, from the Access Management
    /// <c>enduser/authorizedparties</c> API. Parties the user can only reach through delegated access to individual
    /// instances are not included.
    /// </summary>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>List of parties.</returns>
    Task<List<Party>?> GetPartyList(
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Verifies that the selected party is contained in the authenticated user's party list
    /// (see <see cref="GetPartyList"/>).
    /// </summary>
    /// <param name="partyId">The party id.</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns> Boolean indicating whether or not the user can represent the selected party.</returns>
    Task<bool?> ValidateSelectedParty(
        int partyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Check if the user is authorized to perform the given action on the given instance.
    /// </summary>
    /// <param name="appIdentifier"></param>
    /// <param name="instanceIdentifier"></param>
    /// <param name="user"></param>
    /// <param name="action"></param>
    /// <param name="taskId"></param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<bool> AuthorizeAction(
        AppIdentifier appIdentifier,
        InstanceIdentifier instanceIdentifier,
        ClaimsPrincipal user,
        string action,
        string? taskId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Check if the user is authorized to perform the given actions on the given instance.
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="user"></param>
    /// <param name="actions"></param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<Dictionary<string, bool>> AuthorizeActions(
        Instance instance,
        ClaimsPrincipal user,
        List<string> actions,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Get organizations where the logged in user has a key role
    /// </summary>
    /// <param name="userId">The user id</param>
    /// <param name="orgNumbers">The org numbers</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>List of organizations</returns>
    Task<List<string>> GetKeyRoleOrganizationParties(
        int userId,
        List<string> orgNumbers,
        CancellationToken cancellationToken = default
    );
}
