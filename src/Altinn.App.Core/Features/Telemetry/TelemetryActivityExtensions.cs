using System.Diagnostics;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using InternalLabels = Altinn.App.Core.Features.Telemetry.InternalLabels;
using Labels = Altinn.App.Core.Features.Telemetry.Labels;

namespace Altinn.App.Core.Features;

/// <summary>
/// Extensions for instrumentation APIs
/// </summary>
public static class TelemetryActivityExtensions
{
    /// <summary>
    /// Sets the user ID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="userId">User ID</param>
    /// <returns>Activity</returns>
    public static Activity SetUserId(this Activity activity, int? userId)
    {
        if (userId is not null)
        {
            activity.SetTag(Labels.UserId, userId.Value);
        }
        return activity;
    }

    /// <summary>
    /// Sets the user party ID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="userPartyId">User party ID</param>
    /// <returns>Activity</returns>
    public static Activity SetUserPartyId(this Activity activity, int? userPartyId)
    {
        if (userPartyId is not null)
        {
            activity.SetTag(Labels.UserPartyId, userPartyId.Value);
        }
        return activity;
    }

    /// <summary>
    /// Sets the username as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="username">Username</param>
    /// <returns>Activity</returns>
    public static Activity SetUsername(this Activity activity, string? username)
    {
        if (!string.IsNullOrWhiteSpace(username))
        {
            activity.SetTag(Labels.UserName, username);
        }
        return activity;
    }

    /// <summary>
    /// Sets the user authentication method as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="authenticationMethod">Authentication method</param>
    /// <returns>Activity</returns>
    public static Activity SetAuthenticationMethod(this Activity activity, string? authenticationMethod)
    {
        if (!string.IsNullOrWhiteSpace(authenticationMethod))
        {
            activity.SetTag(Labels.UserAuthenticationMethod, authenticationMethod);
        }
        return activity;
    }

    /// <summary>
    /// Sets the user authentication level as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="authenticationLevel">Authentication level</param>
    /// <returns>Activity</returns>
    public static Activity SetAuthenticationLevel(this Activity activity, int? authenticationLevel)
    {
        if (authenticationLevel is not null)
        {
            activity.SetTag(Labels.UserAuthenticationLevel, authenticationLevel.Value);
        }
        return activity;
    }

    /// <summary>
    /// Sets the Instance GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="instance">Instance</param>
    /// <returns>Activity</returns>
    public static Activity SetInstanceId(this Activity activity, Instance? instance)
    {
        if (instance?.Id is not null)
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            activity.SetTag(Labels.InstanceGuid, instanceGuid);
        }
        return activity;
    }

    /// <summary>
    /// Sets the Instance GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="instanceId">Instance ID</param>
    /// <returns>Activity</returns>
    public static Activity SetInstanceId(this Activity activity, string? instanceId)
    {
        if (!string.IsNullOrWhiteSpace(instanceId))
        {
            Guid instanceGuid = Guid.Parse(instanceId.Split("/")[1]);
            activity.SetTag(Labels.InstanceGuid, instanceGuid);
        }
        return activity;
    }

    /// <summary>
    /// Sets the Instance GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="instanceGuid">Instance GUID</param>
    /// <returns>Activity</returns>
    public static Activity SetInstanceId(this Activity activity, Guid? instanceGuid)
    {
        if (instanceGuid is not null)
        {
            activity.SetTag(Labels.InstanceGuid, instanceGuid.Value);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Instance owner Party ID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="instanceOwnerPartyId">Instance owner Party ID</param>
    /// <returns>Activity</returns>
    public static Activity SetInstanceOwnerPartyId(this Activity activity, int? instanceOwnerPartyId)
    {
        if (instanceOwnerPartyId is not null)
        {
            activity.SetTag(Labels.InstanceOwnerPartyId, instanceOwnerPartyId.Value);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Instance owner Party ID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="instanceOwnerPartyId">Instance owner Party ID</param>
    /// <returns>Activity</returns>
    public static Activity SetInstanceOwnerPartyId(this Activity activity, string? instanceOwnerPartyId)
    {
        if (!string.IsNullOrWhiteSpace(instanceOwnerPartyId))
        {
            activity.SetTag(Labels.InstanceOwnerPartyId, instanceOwnerPartyId);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Data GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="dataElement">Data element</param>
    /// <returns>Activity</returns>
    public static Activity SetDataElementId(this Activity activity, DataElement? dataElement)
    {
        if (dataElement?.Id is not null)
        {
            Guid dataGuid = Guid.Parse(dataElement.Id);
            activity.SetTag(Labels.DataGuid, dataGuid);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Data GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="dataElementId">Data element ID</param>
    /// <returns>Activity</returns>
    public static Activity SetDataElementId(this Activity activity, string? dataElementId)
    {
        if (!string.IsNullOrWhiteSpace(dataElementId))
        {
            Guid dataGuid = Guid.Parse(dataElementId);
            activity.SetTag(Labels.DataGuid, dataGuid);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Data GUID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="dataElementId">Data element ID</param>
    /// <returns>Activity</returns>
    public static Activity SetDataElementId(this Activity activity, Guid? dataElementId)
    {
        if (dataElementId is not null)
        {
            activity.SetTag(Labels.DataGuid, dataElementId.Value);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Process Task ID as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="taskId">Task ID</param>
    /// <returns>Activity</returns>
    public static Activity SetTaskId(this Activity activity, string? taskId)
    {
        if (!string.IsNullOrWhiteSpace(taskId))
        {
            activity.SetTag(Labels.TaskId, taskId);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Organisation name as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="organisationName">Organisation name</param>
    /// <returns>Activity</returns>
    public static Activity SetOrganisationName(this Activity activity, string? organisationName)
    {
        if (!string.IsNullOrWhiteSpace(organisationName))
        {
            activity.SetTag(Labels.OrganisationName, organisationName);
        }

        return activity;
    }

    /// <summary>
    /// Sets the Organisation number as a tag/attribute on the activity/span
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="organisationNumber">Organisation number</param>
    /// <returns>Activity</returns>
    public static Activity SetOrganisationNumber(this Activity activity, string? organisationNumber)
    {
        if (!string.IsNullOrWhiteSpace(organisationNumber))
        {
            activity.SetTag(Labels.OrganisationNumber, organisationNumber);
        }

        return activity;
    }

    internal static Activity SetCorrespondence(this Activity activity, SendCorrespondenceResponse? response)
    {
        if (response is not null)
        {
            if (response.Correspondences is { Count: 1 })
            {
                activity.SetTag(Labels.CorrespondenceId, response.Correspondences[0].CorrespondenceId);
            }

            var tags = new ActivityTagsCollection();
            tags.Add("ids", response.Correspondences?.Select(c => c.CorrespondenceId.ToString()) ?? []);
            tags.Add("statuses", response.Correspondences?.Select(c => c.Status.ToString()) ?? []);
            tags.Add("count", response.Correspondences?.Count ?? 0);
            tags.Add("attachments", response.AttachmentIds?.Count ?? 0);
            tags.Add("operation", "send");
            activity.AddEvent(new ActivityEvent("correspondence", tags: tags));
        }

        return activity;
    }

    internal static Activity SetProblemDetails(this Activity activity, ProblemDetails problemDetails)
    {
        // Leave activity status to ASP.NET Core, as it will be set depending on status code?
        // activity.SetStatus(ActivityStatusCode.Error, problemDetails.Title);

        activity.SetTag(InternalLabels.ProblemType, problemDetails.Type);
        activity.SetTag(InternalLabels.ProblemTitle, problemDetails.Title);
        activity.SetTag(InternalLabels.ProblemStatus, problemDetails.Status);

        // Is it safe to use detail here? In some cases the detail field is set from exception message
        // activity.SetTag(InternalLabels.ProblemDetail, problemDetails.Detail);

        return activity;
    }

    internal static Activity? SetProcessChangeResult(this Activity? activity, ProcessChangeResult result)
    {
        if (activity is null)
            return null;

        if (result.Success)
        {
            activity.SetStatus(ActivityStatusCode.Ok);
        }
        else
        {
            activity.SetStatus(ActivityStatusCode.Error, result.ErrorMessage);
            activity.SetTag(InternalLabels.ProcessErrorType, result.ErrorType.ToString());
        }

        var change = result.ProcessStateChange;

        if (change is not null)
        {
            var tags = new ActivityTagsCollection();
            tags.Add("events", change.Events?.Select(e => $"Type={e.EventType} DataId={e.DataId}"));
            var from = change.OldProcessState;
            if (from is not null)
            {
                tags.Add("from.started", from.Started);
                tags.Add("from.ended", from.Ended);
                var fromTask = from.CurrentTask;
                if (fromTask is not null)
                {
                    tags.Add("from.task.name", fromTask.Name);
                }
            }
            var to = change.NewProcessState;
            if (to is not null)
            {
                tags.Add("to.started", to.Started);
                var toTask = to.CurrentTask;
                if (toTask is not null)
                {
                    tags.Add("to.task.name", toTask.Name);
                }
            }
            activity.AddEvent(new ActivityEvent("change", tags: tags));
        }

        return activity;
    }

    internal static Activity? SetAuthenticated(this Activity? activity, Authenticated currentAuth)
    {
        if (activity is null)
            return null;

        activity.SetTag(Labels.UserAuthenticationType, currentAuth.GetType().Name);
        activity.SetTag(Labels.UserAuthenticationTokenIssuer, currentAuth.TokenIssuer);
        activity.SetTag(Labels.UserAuthenticationTokenIsExchanged, currentAuth.TokenIsExchanged);
        if (currentAuth.ClientId is not null)
            activity.SetTag(Labels.UserAuthenticationTokenClientId, currentAuth.ClientId);
        switch (currentAuth)
        {
            case Authenticated.None:
                break;
            case Authenticated.User auth:
            {
                activity.SetUserId(auth.UserId);
                activity.SetUserPartyId(auth.SelectedPartyId);
                activity.SetAuthenticationMethod(auth.AuthenticationMethod);
                activity.SetAuthenticationLevel(auth.AuthenticationLevel);
                activity.SetTag(Labels.UserAuthenticationInAltinnPortal, auth.InAltinnPortal);
                break;
            }
            case Authenticated.Org auth:
            {
                activity.SetOrganisationNumber(auth.OrgNo);
                activity.SetAuthenticationMethod(auth.AuthenticationMethod);
                activity.SetAuthenticationLevel(auth.AuthenticationLevel);
                break;
            }
            case Authenticated.ServiceOwner auth:
            {
                activity.SetOrganisationNumber(auth.OrgNo);
                activity.SetOrganisationName(auth.Name);
                activity.SetAuthenticationMethod(auth.AuthenticationMethod);
                activity.SetAuthenticationLevel(auth.AuthenticationLevel);
                break;
            }
            case Authenticated.SystemUser auth:
            {
                if (auth.SystemUserId is [var systemUserId, ..])
                    activity.SetTag(Labels.OrganisationSystemUserId, systemUserId);

                activity.SetOrganisationNumber(auth.SystemUserOrgNr.Get(OrganisationNumberFormat.Local));
                activity.SetAuthenticationLevel(auth.AuthenticationLevel);
                activity.SetAuthenticationMethod(auth.AuthenticationMethod);
                break;
            }
            default:
                break;
        }

        return activity;
    }

    /// <summary>
    /// Used to record an exception on the activity.
    /// Should be used when
    /// * Calling into user code fails
    /// * ?
    /// Typically, whenever we record an exception,
    /// two spans in a trace will be marked as errored: the root span and this span.
    /// </summary>
    /// <param name="activity">Activity</param>
    /// <param name="exception">Exception</param>
    /// <param name="error">Error message</param>
    internal static void Errored(this Activity activity, Exception? exception = null, string? error = null)
    {
        activity.SetStatus(ActivityStatusCode.Error, error);
        if (exception is not null)
        {
            activity.AddException(exception);
        }
    }
}
