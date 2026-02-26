#nullable disable
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide.Services;

public class OrgWideRequestContextResolver : IRequestContextResolver<AltinnOrgContext>
{
    private readonly HttpContextDataExtractor _dataExtractor;

    public OrgWideRequestContextResolver(HttpContextDataExtractor dataExtractor)
    {
        _dataExtractor = dataExtractor;
    }

    public bool TryResolveContext(HttpContext httpContext, out AltinnOrgContext context)
    {
        context = null;

        if (_dataExtractor.TryResolveOrg(httpContext, out string org))
        {
            context = AltinnOrgContext.FromOrg(org);
            return true;
        }

        return false;
    }
}
