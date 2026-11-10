using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Routing;
using Quartz;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// The span that starts a unit of work: a request's server span, or the span the Quartz instrumentation starts around
/// a job run. It is the unit of work's wide event, which carries every domain attribute that applies
/// (https://github.com/Altinn/altinn-studio/issues/21073). Activity.Current is often a child span instead.
/// </summary>
internal static class RootSpan
{
    private const string QuartzJobOperationName = "Quartz.Job.Execute";

    private static readonly string[] s_serviceOwnerRouteValues = ["org", "orgName"];
    private static readonly string[] s_repositoryRouteValues = ["app", "repo", "repository"];
    private static readonly string[] s_environmentRouteValues = ["env", "environment"];

    public static Activity? Of(HttpContext? httpContext) => httpContext?.Features.Get<IHttpActivityFeature>()?.Activity;

    /// <summary>
    /// The span of the job run the current code is part of, or null outside a job run or with tracing off.
    /// </summary>
    public static Activity? OfJob()
    {
        for (Activity? activity = Activity.Current; activity is not null; activity = activity.Parent)
        {
            if (activity.OperationName == QuartzJobOperationName)
            {
                return activity;
            }
        }
        return null;
    }

    /// <summary>
    /// Records the runtime environment a request targets where it isn't in the route, such as in a request body.
    /// </summary>
    public static void SetTargetEnvironment(this HttpContext httpContext, string environment) =>
        Of(httpContext).SetTargetEnvironment(environment);

    /// <summary>
    /// Adds the domain attributes found in the request's route and user to its root span.
    /// </summary>
    public static void Enrich(Activity activity, HttpResponse response)
    {
        HttpContext httpContext = response.HttpContext;
        // The exception handler clears the route values before it handles a failed request, and keeps them here.
        RouteValueDictionary routeValues =
            httpContext.Features.Get<IExceptionHandlerFeature>()?.RouteValues ?? httpContext.Request.RouteValues;

        if (TryGetRouteValue(routeValues, s_serviceOwnerRouteValues, out string serviceOwner))
        {
            if (TryGetRouteValue(routeValues, s_repositoryRouteValues, out string repository))
            {
                activity.SetRepository(serviceOwner, repository);
            }
            else
            {
                activity.SetServiceOwner(serviceOwner);
            }
        }

        if (TryGetRouteValue(routeValues, s_environmentRouteValues, out string environment))
        {
            activity.SetTargetEnvironment(environment);
        }

        if (httpContext.User.Identity is { IsAuthenticated: true, Name: { Length: > 0 } userName })
        {
            activity.SetEndUser(userName);
        }
    }

    /// <summary>
    /// Names a job run's root span after the job's type. Quartz names it after the job's key, which can carry IDs,
    /// such as the deploy polling job's build ID, and span names must be a fixed set.
    /// </summary>
    public static void EnrichJobRun(Activity activity, string eventName, object payload)
    {
        if (payload is IJobDetail jobDetail)
        {
            activity.DisplayName = $"execute {jobDetail.JobType.Name}";
        }
    }

    private static bool TryGetRouteValue(RouteValueDictionary routeValues, string[] keys, out string value)
    {
        foreach (string key in keys)
        {
            if (routeValues.TryGetValue(key, out object? rawValue) && rawValue?.ToString() is { Length: > 0 } parsed)
            {
                value = parsed;
                return true;
            }
        }
        value = string.Empty;
        return false;
    }
}
