using System;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

/// <summary>
/// Implementation of IHttpContextDataExtractor that provides common data extraction methods
/// for resolving organization, developer, and app information from HTTP context.
/// </summary>
public class HttpContextDataExtractor : IHttpContextDataExtractor
{
    public bool TryResolveOrg(HttpContext httpContext, out string org)
    {
        org = null;
        var routeValues = httpContext.Request.RouteValues;
        if (routeValues.TryGetValue("org", out object orgValue))
        {
            org = orgValue?.ToString();
            return !string.IsNullOrEmpty(org);
        }

        return false;
    }

    public bool TryResolveDeveloper(HttpContext httpContext, out string developer)
    {
        developer = AuthenticationHelper.GetDeveloperUserName(httpContext);
        return !string.IsNullOrEmpty(developer);
    }

    public bool TryResolveApp(HttpContext httpContext, out string app)
    {
        if (TryResolveAppFromRouteValues(httpContext, out app))
        {
            return true;
        }

        if (TryResolveAppIfResourceAdmin(httpContext, out app))
        {
            return true;
        }

        return false;
    }

    private static bool TryResolveAppFromRouteValues(HttpContext httpContext, out string app)
    {
        app = null;
        var routeValues = httpContext.Request.RouteValues;

        if (routeValues.TryGetValue("app", out object appValue) ||
            routeValues.TryGetValue("repo", out appValue) ||
            routeValues.TryGetValue("repository", out appValue))
        {
            app = appValue?.ToString();
            return !string.IsNullOrEmpty(app);
        }

        return false;
    }

    private bool TryResolveAppIfResourceAdmin(HttpContext httpContext, out string app)
    {
        app = null;
        var endpoint = httpContext.GetEndpoint();

        var controllerActionDescriptor = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();

        if (controllerActionDescriptor == null)
        {
            return false;
        }

        string controllerName = controllerActionDescriptor.ControllerName;
        bool isResourceAdmin = string.Equals(controllerName,
            nameof(ResourceAdminController).Replace("Controller", string.Empty),
            StringComparison.InvariantCulture);

        if (isResourceAdmin && TryResolveOrg(httpContext, out string org))
        {
            app = $"{org}-resources";
            return true;
        }

        return false;
    }
}
