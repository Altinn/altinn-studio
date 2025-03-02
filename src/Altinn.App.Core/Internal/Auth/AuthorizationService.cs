using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Process.Authorization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// Service that handles authorization. Uses AuthorizationClient to communicate with authorization component. Makes authorization decisions in app context possible
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    private readonly IAuthorizationClient _authorizationClient;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationService"/> class
    /// </summary>
    /// <param name="authorizationClient">The authorization client</param>
    /// <param name="authenticationContext">The authentication context</param>
    /// <param name="serviceProvider">The service provider</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public AuthorizationService(
        IAuthorizationClient authorizationClient,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider,
        Telemetry? telemetry = null
    )
    {
        _authorizationClient = authorizationClient;
        _authenticationContext = authenticationContext;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<List<Party>?> GetPartyList(int userId)
    {
        using var activity = _telemetry?.StartGetPartyListActivity(userId);
        return await _authorizationClient.GetPartyList(userId);
    }

    /// <inheritdoc />
    public async Task<bool?> ValidateSelectedParty(int userId, int partyId)
    {
        using var activity = _telemetry?.StartValidateSelectedPartyActivity(userId, partyId);
        return await _authorizationClient.ValidateSelectedParty(userId, partyId);
    }

    /// <inheritdoc />
    public async Task<bool> AuthorizeAction(
        AppIdentifier appIdentifier,
        InstanceIdentifier instanceIdentifier,
        ClaimsPrincipal user,
        string action,
        string? taskId = null
    )
    {
        using var activity = _telemetry?.StartAuthorizeActionActivity(instanceIdentifier, action, taskId);
        if (!await _authorizationClient.AuthorizeAction(appIdentifier, instanceIdentifier, user, action, taskId))
        {
            return false;
        }

        var authorizers = _appImplementationFactory.GetAll<IUserActionAuthorizerProvider>();
        foreach (var authorizerRegistrator in authorizers.Where(a => IsAuthorizerForTaskAndAction(a, taskId, action)))
        {
            var context = new UserActionAuthorizerContext(
                user,
                instanceIdentifier,
                taskId,
                action,
                _authenticationContext.Current
            );
            if (!await authorizerRegistrator.Authorizer.AuthorizeAction(context))
            {
                return false;
            }
        }

        return true;
    }

    /// <inheritdoc />
    public async Task<List<UserAction>> AuthorizeActions(
        Instance instance,
        ClaimsPrincipal user,
        List<AltinnAction> actions
    )
    {
        using var activity = _telemetry?.StartAuthorizeActionsActivity(instance, actions);
        var authDecisions = await _authorizationClient.AuthorizeActions(
            instance,
            user,
            actions.Select(a => a.Value).ToList()
        );
        List<UserAction> authorizedActions = [];
        foreach (var action in actions)
        {
            authorizedActions.Add(
                new UserAction()
                {
                    Id = action.Value,
                    Authorized = authDecisions[action.Value],
                    ActionType = action.ActionType,
                }
            );
        }

        return authorizedActions;
    }

    private static bool IsAuthorizerForTaskAndAction(
        IUserActionAuthorizerProvider authorizer,
        string? taskId,
        string action
    )
    {
        return (authorizer.TaskId == null && authorizer.Action == null)
            || (authorizer.TaskId == null && authorizer.Action == action)
            || (authorizer.TaskId == taskId && authorizer.Action == null)
            || (authorizer.TaskId == taskId && authorizer.Action == action);
    }
}
