using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Recognizes the one failure that looks like an infrastructure problem but is really a
/// configuration one: Altinn Authorization denying the app while it acts as the service owner.
///
/// The app persists process transitions and instance data to Storage as the service owner rather
/// than as the end user, and Storage authorizes those calls against the app's own
/// <c>config/authorization/policy.xml</c> with <c>urn:altinn:org</c> as the subject. A policy that
/// only grants the end user - the common shape of a v8 policy - therefore yields a bare HTTP 403
/// somewhere inside a workflow command, which says nothing about whose rights were missing. This
/// turns that into a sentence naming the app owner, the policy file, and the rights to look for.
/// </summary>
internal static class ServiceOwnerAuthorizationDiagnostics
{
    /// <summary>
    /// Whether the exception (or any exception it wraps) is a platform call rejected with HTTP 403.
    /// A 401 is deliberately not included: an expired or unobtainable token is a transient condition,
    /// not a policy gap.
    /// </summary>
    internal static bool IsAuthorizationDenied(Exception? exception)
    {
        while (exception is not null)
        {
            if (exception is PlatformHttpException { StatusCode: HttpStatusCode.Forbidden })
            {
                return true;
            }

            if (exception is AggregateException aggregate)
            {
                foreach (Exception inner in aggregate.InnerExceptions)
                {
                    if (IsAuthorizationDenied(inner))
                    {
                        return true;
                    }
                }
            }

            exception = exception.InnerException;
        }

        return false;
    }

    /// <summary>
    /// Explains what a service-owner 403 means for this app, and what to check. The denied action is
    /// deliberately not asserted - Storage's response does not say which one it was - so this names
    /// the rights the app needs at minimum and the task-specific one the current task adds.
    /// </summary>
    /// <param name="appMetadata">The app whose policy is in question - its own metadata, not the request's route.</param>
    /// <param name="currentTaskId">The process task the callback was executing in, if any.</param>
    /// <param name="altinnTaskType">The <c>altinn:taskType</c> of that task, if any.</param>
    internal static string Describe(ApplicationMetadata appMetadata, string? currentTaskId, string? altinnTaskType)
    {
        // Taken from the identifier rather than the metadata's own 'org' field, which is optional in
        // the file and would render an empty name when omitted.
        string org = appMetadata.AppIdentifier.Org;
        string appId = appMetadata.Id;

        // The task id and type reach this message from the callback payload, so they are sanitized
        // before they are logged - as elsewhere on this path.
        string taskRights = altinnTaskType is null
            ? ""
            : $" Advancing the current task '{LogSanitizer.Sanitize(currentTaskId)}' "
                + $"({LogSanitizer.Sanitize(altinnTaskType)}) additionally requires one of "
                + $"[{string.Join(", ", ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType(altinnTaskType))}].";

        return $"A platform call was rejected with HTTP 403 while executing a workflow command. If it was one the "
            + $"app makes on its own behalf - persisting process state, or reading or writing instance data - then "
            + $"Altinn Authorization denied the app owner '{org}', and this is what a missing service-owner grant "
            + $"in config/authorization/policy.xml looks like rather than a transient platform failure: the app "
            + $"performs those operations as the service owner, not as the end user. Check that the policy permits "
            + $"the org subject '{org}' at least [read, write] on {appId}.{taskRights} Running the v8 to v9 upgrade "
            + $"adds the missing rule. (A 403 from a platform call your own handler makes is unrelated to the "
            + $"app's policy.)";
    }
}
