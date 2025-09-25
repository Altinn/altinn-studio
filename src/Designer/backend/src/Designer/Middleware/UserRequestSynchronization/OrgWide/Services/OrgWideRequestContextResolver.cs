using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide.Services;

public class OrgWideRequestContextResolver : IRequestContextResolver<AltinnOrgContext>
{
    public bool TryResolveContext(HttpContext httpContext, out AltinnOrgContext context)
    {
        context = null;

        if (TryResolveOrg(httpContext, out string org))
        {
            context = AltinnOrgContext.FromOrg(org);
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
}
