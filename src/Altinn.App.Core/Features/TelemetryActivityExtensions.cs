using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using OpenTelemetry.Trace;
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
    /// Sets the Process Task ID as a tag/attribute on the activity/span
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
        activity.RecordException(exception);
    }
}
