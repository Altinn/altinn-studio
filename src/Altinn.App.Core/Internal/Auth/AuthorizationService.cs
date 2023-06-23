using System.Security.Claims;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Internal.Process.Action;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// Service that handles authorization. Uses AuthorizationClient to communicate with authorization component. Makes authorization decisions in app context possible
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    private readonly IAuthorizationClient _authorizationClient;
    private readonly IEnumerable<IUserActionAuthorizerProvider> _userActionAuthorizers;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationService"/> class
    /// </summary>
    /// <param name="authorizationClient">The authorization client</param>
    /// <param name="userActionAuthorizers">The user action authorizers</param>
    public AuthorizationService(IAuthorizationClient authorizationClient, IEnumerable<IUserActionAuthorizerProvider> userActionAuthorizers)
    {
        _authorizationClient = authorizationClient;
        _userActionAuthorizers = userActionAuthorizers;
    }

    /// <inheritdoc />
    public async Task<List<Party>?> GetPartyList(int userId)
    {
        return await _authorizationClient.GetPartyList(userId);
    }

    /// <inheritdoc />
    public async Task<bool?> ValidateSelectedParty(int userId, int partyId)
    {
        return await _authorizationClient.ValidateSelectedParty(userId, partyId);
    }

    /// <inheritdoc />
    public async Task<bool> AuthorizeAction(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, ClaimsPrincipal user, string action, string? taskId = null)
    {
        if (!await _authorizationClient.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
        {
            return false;
        }

        foreach (var authorizerRegistrator in _userActionAuthorizers.Where(a => IsAuthorizerForTaskAndAction(a, taskId, action)))
        {
            var context = new UserActionAuthorizerContext(user, instanceIdentifier, taskId, action);
            if (!await authorizerRegistrator.Authorizer.AuthorizeAction(context))
            {
                return false;
            }
        }

        return true;
    }

    private static bool IsAuthorizerForTaskAndAction(IUserActionAuthorizerProvider authorizer, string? taskId, string action)
    {
        return (authorizer.TaskId == null && authorizer.Action == null)
               || (authorizer.TaskId == null && authorizer.Action == action)
               || (authorizer.TaskId == taskId && authorizer.Action == null)
               || (authorizer.TaskId == taskId && authorizer.Action == action);
    }
}
