using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Recognises the one failure that looks like an infrastructure problem but is really a
/// configuration one: Altinn Authorization denying the app while it acts as the service owner.
///
/// The app persists process transitions and instance data to Storage as the service owner rather
/// than as the end user, and Storage authorizes those calls against the app's own
/// <c>config/authorization/policy.xml</c> with <c>urn:altinn:org</c> as the subject. A policy that
/// only grants the end user - the common shape of a v8 policy - therefore yields a bare HTTP 403
/// somewhere inside a workflow command, which says nothing about whose rights were missing. This
/// turns that into a sentence naming the app owner, the policy file, and the build-time rule that
/// would have caught it.
/// </summary>
internal static class ServiceOwnerAuthorizationDiagnostics
{
    /// <summary>The build-time rule that checks the same requirements before the app ever runs.</summary>
    private const string AnalyzerRule = "ALTINNAPP0800";

    private const string DocsLink =
        "https://docs.altinn.studio/nb/altinn-studio/v8/reference/analysis/rules/altinnapp0800";

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
    /// the rights the app needs and defers to <see cref="AnalyzerRule"/> for the complete list.
    /// </summary>
    /// <param name="appIdentifier">The app whose policy is in question.</param>
    /// <param name="currentTaskId">The process task the callback was executing in, if any.</param>
    /// <param name="altinnTaskType">The <c>altinn:taskType</c> of that task, if any.</param>
    internal static string Describe(AppIdentifier appIdentifier, string? currentTaskId, string? altinnTaskType)
    {
        string org = appIdentifier.Org;
        string appId = $"{appIdentifier.Org}/{appIdentifier.App}";

        string taskRights = altinnTaskType is null
            ? ""
            : $" Advancing the current task '{currentTaskId}' ({altinnTaskType}) additionally requires one of "
                + $"[{string.Join(", ", ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType(altinnTaskType))}].";

        return $"Altinn Authorization denied the app owner '{org}' while the app was acting as the service owner "
            + $"(HTTP 403). The app persists process transitions and instance data to Storage as the service owner, "
            + $"not as the end user, so this is what a missing service-owner grant in "
            + $"config/authorization/policy.xml looks like - not a transient platform failure. Check that the "
            + $"policy permits the org subject '{org}' at least [read, write] on {appId}.{taskRights} "
            + $"Running the v8 to v9 upgrade adds the missing rule; the build-time rule {AnalyzerRule} "
            + $"({DocsLink}) checks the complete set.";
    }
}
