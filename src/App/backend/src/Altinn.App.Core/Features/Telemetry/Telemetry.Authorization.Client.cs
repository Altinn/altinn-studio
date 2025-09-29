using System.Diagnostics;
using Altinn.App.Core.Internal.Process.Authorization;
using Altinn.App.Core.Models;
using static Altinn.App.Core.Features.Telemetry.AuthorizationClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartClientGetPartyListActivity(int userId)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.GetPartyList");
        activity?.SetUserId(userId);

        return activity;
    }

    internal Activity? StartClientValidateSelectedPartyActivity(int userId, int partyId)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateSelectedParty");
        {
            activity?.SetUserId(userId);
            activity?.SetInstanceOwnerPartyId(partyId);
        }
        return activity;
    }

    internal Activity? StartClientAuthorizeActionActivity(
        InstanceIdentifier instanceIdentifier,
        string action,
        string? taskId = null
    )
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.AuthorizeAction");

        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        activity?.SetInstanceOwnerPartyId(instanceIdentifier.InstanceOwnerPartyId);
        activity?.SetTag(InternalLabels.AuthorizationAction, action);
        activity?.SetTaskId(taskId);

        return activity;
    }

    internal Activity? StartClientAuthorizeActionsActivity(Platform.Storage.Interface.Models.Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.AuthorizeActions");

        activity?.SetInstanceId(instance);

        return activity;
    }

    internal Activity? StartClientGetRolesActivity(int userId)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.GetRoles");

        activity?.SetUserId(userId);

        return activity;
    }

    internal Activity? StartClientIsAuthorizerActivity(
        IUserActionAuthorizerProvider authorizer,
        string? taskId,
        string action
    )
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.IsAuthorizerForTaskAndAction");
        if (activity is not null)
        {
            activity.SetTaskId(taskId);
            if (authorizer.TaskId is not null)
                activity.SetTag(InternalLabels.AuthorizerTaskId, authorizer.TaskId);
            if (authorizer.Action is not null)
                activity.SetTag(InternalLabels.AuthorizerAction, authorizer.Action);
            activity.SetTag(InternalLabels.AuthorizationAction, action);
        }
        return activity;
    }

    internal static class AuthorizationClient
    {
        internal const string Prefix = "Authorization.Client";
    }
}
