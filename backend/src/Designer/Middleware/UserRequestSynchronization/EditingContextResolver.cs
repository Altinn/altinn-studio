using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public class EditingContextResolver : IEditingContextResolver
{
    public bool TryResolveContext(HttpContext httpContext, out AltinnRepoEditingContext context)
    {
        context = null;
        var routeValues = httpContext.Request.RouteValues;

        string org = routeValues.TryGetValue("org", out var orgValue) ? orgValue?.ToString() : null;
        string app = null;

        if (routeValues.TryGetValue("app", out object appValue) || routeValues.TryGetValue("repo", out appValue) ||
            routeValues.TryGetValue("repository", out appValue))
        {
            app = appValue?.ToString();
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(httpContext);


        if (string.IsNullOrEmpty(org) || string.IsNullOrEmpty(app) || string.IsNullOrEmpty(developer))
        {
            return false;
        }

        context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        return true;
    }
}
