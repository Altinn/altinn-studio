using System;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;

public class RepoUserWideRequestContextResolver : IRequestContextResolver<AltinnRepoEditingContext>
{
    public bool TryResolveContext(HttpContext httpContext, out AltinnRepoEditingContext context)
    {
        context = null;

        if (TryResolveOrg(httpContext, out string org) && TryResolveApp(httpContext, out string app) && TryResolveDeveloper(httpContext, out string developer))
        {
            context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            return true;
        }

        return false;
    }

    private static bool TryResolveOrg(HttpContext httpContext, out string org)
    {
        org = null;
        var routeValues = httpContext.Request.RouteValues;
        if (routeValues.TryGetValue("org", out object orgValue))
        {
            org = orgValue?.ToString();
            return true;
        }

        return false;

    }

    private static bool TryResolveApp(HttpContext httpContext, out string app)
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

        if (routeValues.TryGetValue("app", out object appValue) || routeValues.TryGetValue("repo", out appValue) ||
            routeValues.TryGetValue("repository", out appValue))
        {
            app = appValue?.ToString();
            return true;
        }

        return false;
    }

    private static bool TryResolveAppIfResourceAdmin(HttpContext httpContext, out string app)
    {
        app = null;
        var endpoint = httpContext.GetEndpoint();

        var controllerActionDescriptor = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();

        if (controllerActionDescriptor == null)
        {
            return false;
        }

        string controllerName = controllerActionDescriptor.ControllerName;
        bool isResourceAdmin = string.Equals(controllerName, nameof(ResourceAdminController).Replace("Controller", string.Empty),
            StringComparison.InvariantCulture);
        if (isResourceAdmin && TryResolveOrg(httpContext, out string org))
        {
            app = $"{org}-resources";
            return true;
        }

        return false;
    }

    private static bool TryResolveDeveloper(HttpContext httpContext, out string developer)
    {
        developer = AuthenticationHelper.GetDeveloperUserName(httpContext);
        return !string.IsNullOrEmpty(developer);
    }
}
