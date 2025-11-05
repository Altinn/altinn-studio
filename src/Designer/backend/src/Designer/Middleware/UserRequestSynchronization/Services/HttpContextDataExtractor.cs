#nullable disable
using System;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

/// <summary>
/// Service for extracting common data from HTTP context.
/// Provides reusable methods for resolving organization, developer, and app information.
/// </summary>
public class HttpContextDataExtractor
{
    /// <summary>
    /// Attempts to resolve the organization from the HTTP context route values.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing route information.</param>
    /// <param name="org">The resolved organization name, or null if not found.</param>
    /// <returns>True if organization was successfully resolved, false otherwise.</returns>
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

    /// <summary>
    /// Attempts to resolve the developer from the HTTP context authentication information.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing authentication information.</param>
    /// <param name="developer">The resolved developer name, or null if not found.</param>
    /// <returns>True if developer was successfully resolved, false otherwise.</returns>
    public bool TryResolveDeveloper(HttpContext httpContext, out string developer)
    {
        developer = AuthenticationHelper.GetDeveloperUserName(httpContext);
        return !string.IsNullOrEmpty(developer);
    }

    /// <summary>
    /// Attempts to resolve the app/repository from the HTTP context route values or controller metadata.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing route information.</param>
    /// <param name="app">The resolved app/repository name, or null if not found.</param>
    /// <returns>True if app was successfully resolved, false otherwise.</returns>
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
